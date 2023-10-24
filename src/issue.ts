import { info, setOutput } from "@actions/core";
import { Rollupable } from "./rollupable";

export class Issue extends Rollupable {
  private get octokitArgs() {
    return {
      owner: this.owner,
      repo: this.repoName,
      issue_number: this.number,
    };
  }

  public async getData() {
    info(`Getting data for issue ${this.number}`);
    const response = await this.octokit.rest.issues.get(this.octokitArgs);
    const labels = response.data.labels.map((label: any) => {
      return { name: label.name };
    });
    this._data = {
      labels,
      body: response.data.body as string,
      title: response.data.title,
      comments: [],
    };
  }

  public async updateBody() {
    setOutput("Updating body to: ", this.bodyWithRollup());
    await this.octokit.rest.issues.update({
      ...this.octokitArgs,
      body: this.bodyWithRollup(),
    });
  }

  // Returns an array of comments on the issue
  public async getComments() {
    info(`Getting comments for issue ${this.number}`);
    const response = await this.octokit.rest.issues.listComments(
      this.octokitArgs,
    );
    this._comments = response.data.map((comment: any) => {
      return {
        body: comment.body,
        user: {
          login: comment.user.login,
        },
      };
    });
  }
}
