"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Discussion = void 0;
const core_1 = require("@actions/core");
const rollupable_1 = require("./rollupable");
const dataQuery = `
  query ($name: String!, $owner: String!, $number: Int!) {
    repository(name: $name, owner: $owner) {
      discussion(number: $number) {
        id
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
class Discussion extends rollupable_1.Rollupable {
    get octokitArgs() {
        return {
            owner: this.owner,
            name: this.repoName,
            number: this.number,
        };
    }
    getComments() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, core_1.info)(`Getting comments for discussion ${this.number}`);
            const response = yield this.octokit.graphql.paginate(commentQuery, this.octokitArgs);
            const comments = response.repository.discussion.comments.nodes;
            this._comments = comments.map((comment) => {
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
            (0, core_1.info)(`Getting data for discussion ${this.number}`);
            const response = yield this.octokit.graphql(dataQuery, this.octokitArgs);
            this._data = response.repository.discussion;
        });
    }
    updateBody(downloadUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, core_1.setOutput)("Updating body to: ", this.bodyWithRollup(downloadUrl));
            yield this.octokit.graphql(updateBodyMutation, {
                discussionId: this.id,
                body: this.bodyWithRollup(downloadUrl),
            });
        });
    }
}
exports.Discussion = Discussion;
