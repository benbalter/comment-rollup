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
exports.Issue = void 0;
const core_1 = require("@actions/core");
const rollupable_1 = require("./rollupable");
class Issue extends rollupable_1.Rollupable {
    get octokitArgs() {
        return {
            owner: this.owner,
            repo: this.repoName,
            issue_number: this.number,
        };
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, core_1.info)(`Getting data for issue ${this.number}`);
            const response = yield this.octokit.rest.issues.get(this.octokitArgs);
            const labels = response.data.labels.map((label) => {
                return { name: label.name };
            });
            this._data = {
                labels,
                body: response.data.body,
                title: response.data.title,
                comments: [],
            };
        });
    }
    updateBody(downloadUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, core_1.setOutput)("Updating body to: ", this.bodyWithRollup(downloadUrl));
            yield this.octokit.rest.issues.update(Object.assign(Object.assign({}, this.octokitArgs), { body: this.bodyWithRollup(downloadUrl) }));
        });
    }
    // Returns an array of comments on the issue
    getComments() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, core_1.info)(`Getting comments for issue ${this.number}`);
            const response = yield this.octokit.rest.issues.listComments(this.octokitArgs);
            this._comments = response.data.map((comment) => {
                return {
                    body: comment.body,
                    user: {
                        login: comment.user.login,
                    },
                };
            });
        });
    }
}
exports.Issue = Issue;
