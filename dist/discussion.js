var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { info, setOutput } from "@actions/core";
import { Rollupable } from "./rollupable";
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
    get octokitArgs() {
        return {
            owner: this.owner,
            name: this.repoName,
            number: this.number,
        };
    }
    getComments() {
        return __awaiter(this, void 0, void 0, function* () {
            info(`Getting comments for discussion ${this.number}`);
            const response = yield this.octokit.graphql.paginate(commentQuery, this.octokitArgs);
            const comments = response.repository.discussion.comments.nodes;
            this.comments = comments.map((comment) => {
                return {
                    body: comment.body,
                    user: {
                        login: comment.author.login,
                    },
                };
            });
        });
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            info(`Getting data for discussion ${this.number}`);
            const response = yield this.octokit.graphql(dataQuery, this.octokitArgs);
            this._data = response.repository.discussion;
            // backwards compatibility with the REST API response data used for Issues
            if (this._data !== undefined) {
                this._data.labels = response.repository.discussion.labels.nodes;
            }
        });
    }
    updateBody(downloadUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            setOutput("Updating body to: ", this.bodyWithRollup(downloadUrl));
            yield this.octokit.graphql(updateBodyMutation, {
                discussionId: this.id,
                body: this.bodyWithRollup(downloadUrl),
            });
        });
    }
}
