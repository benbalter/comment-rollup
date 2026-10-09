import { info } from "@actions/core";
import { Rollupable, type RollupableClass } from "./rollupable.js";
import { getOctokit } from "./octokit.js";

export class Issue extends Rollupable implements RollupableClass {
  private get octokitArgs() {
    return {
      owner: this.owner,
      repo: this.repoName,
      issue_number: this.number,
    };
  }

  public async getData() {
    info(`Getting data for issue ${this.number}`);
    const response = await getOctokit().rest.issues.get(this.octokitArgs);
    const labels = response.data.labels.map(
      (label: { name?: string | undefined } | string) => {
        if (typeof label === "string") {
          return { name: label };
        }
        return { name: label.name };
      },
    );
    this._data = {
      labels,
      body: response.data.body ?? "",
      title: response.data.title,
      comments: [],
    };
  }

  public async updateBody(
    downloadUrl?: string,
  ): Promise<string | null | undefined> {
    return this.writeBody(this.bodyWithRollup(downloadUrl));
  }

  protected async writeBody(body: string): Promise<string | null | undefined> {
    const response = await getOctokit().rest.issues.update({
      ...this.octokitArgs,
      body,
    });
    return response.data.body;
  }

  // Returns an array of comments on the issue
  public async getComments() {
    info(`Getting comments for issue ${this.number}`);
    const octokit = getOctokit();
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      ...this.octokitArgs,
      per_page: 100,
    });
    this.comments = comments.map((comment) => {
      return {
        body: comment.body,
        user: {
          login: comment.user?.login,
        },
      };
    });
  }
}
