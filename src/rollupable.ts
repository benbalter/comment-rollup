import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import HTMLtoDOCX from "html-to-docx";
import { type Octokit } from "octokit";
import { getInput } from "@actions/core";
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
import { writeFileSync } from "fs";
import { type Buffer } from "buffer";
import { create as createArtifactClient } from "@actions/artifact";
import { info } from "console";

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

  public rollup(downloadUrl?: string) {
    let md = "";

    if (this.comments === undefined) {
      return;
    }

    for (const comment of this.comments) {
      md += `From: ${comment.user.login}\n\n${comment.body}\n\n`;
    }

    if (downloadUrl !== undefined) {
      md += `[Download rollup](${downloadUrl})\n\n`;
    }

    return md;
  }

  public async htmlRollup() {
    return await unified()
      .use(remarkParse)
      .use(remarkHtml)
      .process(this.rollup());
  }

  public async docxRollup() {
    const html = await this.htmlRollup();
    return await HTMLtoDOCX(String(html.toString()));
  }

  public async writeRollup() {
    info("Writing rollup to disk");
    const docx = (await this.docxRollup()) as Buffer;
    writeFileSync("rollup.docx", docx);
  }

  public async uploadRollup() {
    await this.writeRollup();
    info("Uploading rollup as artifact");
    const artifactClient = createArtifactClient();
    const name = "rollup.docx";
    const files = ["rollup.docx"];
    const rootDirectory = ".";
    const options = {
      retentionDays: 7,
    };
    return await artifactClient.uploadArtifact(
      name,
      files,
      rootDirectory,
      options,
    );
  }

  public async getUploadedRollupUrl() {
    if (process.env.GITHUB_RUN_ID === undefined) {
      throw new Error("GITHUB_RUN_ID is undefined");
    }

    const runId = parseInt(process.env.GITHUB_RUN_ID);
    const response = await this.octokit.rest.actions.listWorkflowRunArtifacts({
      owner: this.owner,
      repo: this.repoName,
      run_id: runId,
    });

    const id = response.data.artifacts[0].id;
    return `https://github.com/${this.owner}/${this.repoName}/suites/${runId}/artifacts/${id}`;
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

  public async updateBody(downloadUrl?: string): Promise<void> {
    throw new Error("Not implemented");
  }

  public bodyWithRollup(downloadUrl?: string): string {
    if (this.body === undefined) {
      throw new Error("Rollupable body is undefined");
    }

    let body: string;
    let rollup = this.rollup(downloadUrl);
    rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;

    if (this.body?.match(rollupRegex) != null) {
      body = this.body.replace(rollupRegex, rollup);
    } else {
      body = `${this.body}\n\n${rollup}`;
    }

    return body;
  }
}
