import { info, setOutput } from "@actions/core";
import { Rollupable } from "./rollupable";
import type { GraphQlQueryResponseData } from "@octokit/graphql";

const dataQuery = `
  query ($name: String!, $owner: String!, $number: Int!) {
    repository(name: $name, owner: $owner) {
      discussion(number: $number) {
        id
        title
        labels(first: 10) {
          nodes {
            name
          }
        }
        body
      }
    }
  }
`;

const commentQuery = `
query ($name: String!, $owner: String!, $number: Int!, $cursor: String) {
  repository(name: $name, owner: $owner) {
    discussion(number: $number) {
      comments(last: 100, after: $cursor) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          author {
            login
          }
          body
        }
      }
    }
  }
}

`;
const updateBodyMutation = `
  mutation ($discussionId: ID!, $body: String!) {
    updateDiscussion(input: {body: $body, discussionId: $discussionId}) {
      discussion {
        body
      }
    }
  }
`;

export class Discussion extends Rollupable {
  private get octokitArgs() {
    return {
      owner: this.owner,
      name: this.repoName,
      number: this.number,
    };
  }

  public async getComments() {
    info(`Getting comments for discussion ${this.number}`);
    const response: GraphQlQueryResponseData =
      await this.octokit.graphql.paginate(commentQuery, this.octokitArgs);
    const comments = response.repository.discussion.comments.nodes;
    this._comments = comments.map((comment: any) => {
      return {
        body: comment.body,
        user: {
          login: comment.author.login,
        },
      };
    });
  }

  public async getData() {
    info(`Getting data for discussion ${this.number}`);
    const response: GraphQlQueryResponseData = await this.octokit.graphql(
      dataQuery,
      this.octokitArgs,
    );
    this._data = response.repository.discussion;

    // backwards compatibility with the REST API response data used for Issues
    if (this._data !== undefined) {
      this._data.labels = response.repository.discussion.labels.nodes;
    }
  }

  public async updateBody(downloadUrl?: string) {
    setOutput("Updating body to: ", this.bodyWithRollup(downloadUrl));
    await this.octokit.graphql(updateBodyMutation, {
      discussionId: this.id,
      body: this.bodyWithRollup(downloadUrl),
    });
  }
}
