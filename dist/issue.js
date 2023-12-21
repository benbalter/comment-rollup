import { info, setOutput } from "@actions/core";
import { Rollupable, } from "./rollupable.js";
export class Issue extends Rollupable {
    get octokitArgs() {
        return {
            owner: this.owner,
            repo: this.repoName,
            issue_number: this.number,
        };
    }
    async getData() {
        info(`Getting data for issue ${this.number}`);
        const response = await this.octokit.rest.issues.get(this.octokitArgs);
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
    }
    async updateBody(downloadUrl) {
        const body = this.bodyWithRollup(downloadUrl);
        setOutput("Updating body to: ", body);
        await this.octokit.rest.issues.update({
            ...this.octokitArgs,
            body,
        });
    }
    // Returns an array of comments on the issue
    async getComments() {
        info(`Getting comments for issue ${this.number}`);
        const response = await this.octokit.rest.issues.listComments(this.octokitArgs);
        this.comments = response.data.map((comment) => {
            return {
                body: comment.body,
                user: {
                    login: comment.user?.login,
                },
            };
        });
    }
}
