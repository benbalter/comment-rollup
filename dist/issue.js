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
export class Issue extends Rollupable {
    get octokitArgs() {
        return {
            owner: this.owner,
            repo: this.repoName,
            issue_number: this.number,
        };
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            info(`Getting data for issue ${this.number}`);
            const response = yield this.octokit.rest.issues.get(this.octokitArgs);
            const labels = response.data.labels.map((label) => {
                if (typeof label === "string") {
                    return { name: label };
                }
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
            const body = this.bodyWithRollup(downloadUrl);
            setOutput("Updating body to: ", body);
            yield this.octokit.rest.issues.update(Object.assign(Object.assign({}, this.octokitArgs), { body }));
        });
    }
    // Returns an array of comments on the issue
    getComments() {
        return __awaiter(this, void 0, void 0, function* () {
            info(`Getting comments for issue ${this.number}`);
            const response = yield this.octokit.rest.issues.listComments(this.octokitArgs);
            this.comments = response.data.map((comment) => {
                var _a;
                return {
                    body: comment.body,
                    user: {
                        login: (_a = comment.user) === null || _a === void 0 ? void 0 : _a.login,
                    },
                };
            });
        });
    }
}
