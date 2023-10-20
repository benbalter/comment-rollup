import { type Octokit } from "octokit";
import { info, setOutput } from "@actions/core";

interface Label {
  name: string;
}

export class Issue {
  _data:
    | {
        labels: Label[];
        body: string;
        title: string;
      }
    | undefined;

  _ocktokit: Octokit;
  _repository: string;
  _issueNumber: number;
  _comments: Array<{ body?: string }>;

  public get octokit(): Octokit {
    return this._ocktokit;
  }

  public get owner(): string {
    return this._repository.split("/")[0];
  }

  public get repo(): string {
    return this._repository.split("/")[1];
  }

  public get labels() {
    return this._data?.labels;
  }

  public get body() {
    return this._data?.body;
  }

  public get title() {
    return this._data?.title;
  }

  public get comments() {
    return this._comments;
  }

  private get octokitArgs() {
    return {
      owner: this.owner,
      repo: this.repo,
      issue_number: this.issueNumber,
    };
  }

  constructor(
    public octokit: Octokit,
    public repository: string,
    public issueNumber: number,
  ) {
    this._ocktokit = octokit;
    this._repository = repository;
    this._issueNumber = issueNumber;
  }

  public async getData() {
    info(`Getting data for issue ${this.issueNumber}`);
    const response = await this.octokit.rest.issues.get(this.octokitArgs);
    this._data = response.data;
  }

  public async updateBody(body: string) {
    setOutput("Updating body to: ", body);
    return await this.octokit.rest.issues.update({
      ...this.octokitArgs,
      body,
    });
  }

  // Returns true if the issue has the given label
  public hasLabel(label: string): boolean {
    if (this.labels === undefined) {
      return false;
    }

    return this.labels?.some((candidate: label) => candidate.name === label);
  }

  // Returns an array of comments on the issue
  public async getComments() {
    info(`Getting comments for issue ${this.issueNumber}`);
    const response = await this.octokit.rest.issues.listComments(
      this.octokitArgs,
    );
    this._comments = response.data;
    return this._comments;
  }
}
