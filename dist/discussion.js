"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discussion = void 0;
const core_1 = require("@actions/core");
const rollupable_js_1 = require("./rollupable.js");
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
class Discussion extends rollupable_js_1.Rollupable {
    get octokitArgs() {
        return {
            owner: this.owner,
            name: this.repoName,
            number: this.number,
        };
    }
    async getComments() {
        (0, core_1.info)(`Getting comments for discussion ${this.number}`);
        const response = await this.octokit.graphql.paginate(commentQuery, this.octokitArgs);
        const comments = response.repository.discussion.comments.nodes;
        this.comments = comments.map((comment) => {
            return {
                body: comment.body,
                user: {
                    login: comment.author.login,
                },
            };
        });
    }
    async getData() {
        (0, core_1.info)(`Getting data for discussion ${this.number}`);
        const response = await this.octokit.graphql(dataQuery, this.octokitArgs);
        this._data = response.repository.discussion;
        // backwards compatibility with the REST API response data used for Issues
        if (this._data !== undefined) {
            this._data.labels = response.repository.discussion.labels.nodes;
        }
    }
    async updateBody(downloadUrl) {
        (0, core_1.setOutput)("Updating body to: ", this.bodyWithRollup(downloadUrl));
        await this.octokit.graphql(updateBodyMutation, {
            discussionId: this.id,
            body: this.bodyWithRollup(downloadUrl),
        });
    }
}
exports.Discussion = Discussion;
