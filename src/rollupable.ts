import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import HTMLtoDOCX from "html-to-docx";
import { type Octokit } from "octokit";
import { getInput } from "@actions/core";
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";

const summary = "Comment rollup";
const rollupRegex = new RegExp(
  `<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`,
  "im",
);

export interface Label {
  name: string;
}

export interface Comment {
  body: string;
  user: {
    login: string;
  };
}

export interface RollupableData {
  labels: Label[];
  body: string | undefined;
  title: string | undefined;
  comments: Comment[];
  id?: string;
}

export class Rollupable {
  _data: RollupableData | undefined;
  _octokit: Octokit;
  _repository: string;
  _number: number;
  _comments: Comment[] | undefined;

  public constructor(repository: string, number: number) {
    this._repository = repository;
    this._number = number;

    const OctokitWithPaginate = GitHub.plugin(paginateGraphql);
    const token = getInput("token", { required: true });
    this._octokit = new OctokitWithPaginate(
      getOctokitOptions(token),
    ) as Octokit;
  }

  public get octokit(): Octokit {
    return this._octokit;
  }

  public get repository(): string {
    return this._repository;
  }

  public get number(): number {
    return this._number;
  }

  public get repoName(): string {
    return this.repository.split("/")[1];
  }

  public get owner(): string {
    return this.repository.split("/")[0];
  }

  public get comments(): Comment[] | undefined {
    return this._comments;
  }

  public get body(): string | undefined {
    return this._data?.body;
  }

  public get title(): string | undefined {
    return this._data?.title;
  }

  public get labels() {
    return this._data?.labels.map((label: any) => label.name);
  }

  public get id() {
    return this._data?.id;
  }

  public rollup() {
    let md = "";

    if (this.comments === undefined) {
      return;
    }

    for (const comment of this.comments) {
      md += `From: ${comment.user.login}\n\n${comment.body}\n\n`;
    }

    return md;
  }

  public async doc() {
    const html = await unified()
      .use(remarkParse)
      .use(remarkHtml)
      .process(this.rollup());

    return await HTMLtoDOCX(String(html.toString()));
  }

  // Returns true if the issue has the given label
  public hasLabel(label: string): boolean {
    if (this.labels === undefined) {
      return false;
    }

    return this.labels?.some((candidate: Label) => candidate.name === label);
  }

  public async getData(): Promise<void> {
    throw new Error("Not implemented");
  }

  public async getComments(): Promise<void> {
    throw new Error("Not implemented");
  }

  public async updateBody(): Promise<void> {
    throw new Error("Not implemented");
  }

  public bodyWithRollup(): string {
    if (this.body === undefined) {
      throw new Error("Rollupable body is undefined");
    }

    let body: string;
    let rollup = this.comments?.map((comment) => comment.body).join("\n\n");
    rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;

    if (this.body?.match(rollupRegex) != null) {
      body = this.body.replace(rollupRegex, rollup);
    } else {
      body = `${this.body}\n\n${rollup}`;
    }

    return body;
  }
}
