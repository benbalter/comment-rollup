import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import HTMLtoDOCX from "html-to-docx";
import { type Octokit } from "octokit";
import { getInput } from "@actions/core";
// @ts-ignore - not sure why this doesn't work
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";

import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
import { writeFileSync } from "fs";
import { type Buffer } from "buffer";
import { DefaultArtifactClient } from "@actions/artifact";
import { info } from "console";
import { type VFile } from "vfile";

const summary = "Comment rollup";
const rollupRegex = new RegExp(
  `<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`,
  "im",
);

export interface Label {
  name?: string | undefined;
}

export interface Comment {
  body?: string | undefined;
  user?:
    | {
        login?: string | undefined;
      }
    | undefined
    | null;
}

export interface RollupableData {
  labels: Label[];
  body: string | undefined;
  title: string | undefined;
  comments: Comment[];
  id?: string;
}

export interface RollupableClass {
  octokit: Octokit;
  repository: string;
  number: number;
  repoName: string;
  owner: string;
  comments: Comment[] | undefined;
  body: string | undefined;
  title: string | undefined;
  labels: string[] | undefined;
  id: string | undefined;
  commentsByHeadings: () => string;
  rollup: (downloadUrl?: string) => string | undefined;
  htmlRollup: () => Promise<VFile>;
  docxRollup: () => Promise<Buffer | Blob>;
  writeRollup: () => Promise<void>;
  uploadRollup: () => Promise<number | undefined>;
  getUploadedRollupUrl: (id?: number) => string | undefined;
  hasLabel: (label: string) => boolean;
  getData: () => Promise<void>;
  getComments: () => Promise<void>;
  bodyWithRollup: (rollup: string) => string;
}

export abstract class Rollupable implements RollupableClass {
  _data: RollupableData | undefined;
  octokit: Octokit;
  repository: string;
  number: number;
  comments: Comment[] | undefined;
  owner: string;
  repoName: string;

  public constructor(repository: string, number: number, octokit?: Octokit) {
    this.repository = repository;
    this.number = number;

    const parts = repository.split("/");
    this.owner = parts[0];
    this.repoName = parts[1];

    if (octokit !== undefined && octokit !== null) {
      this.octokit = octokit;
      return this;
    }

    const OctokitWithPaginate = GitHub.plugin(paginateGraphql);
    const token = getInput("token", { required: true });
    this.octokit = new OctokitWithPaginate(getOctokitOptions(token)) as Octokit;
  }

  public get body(): string | undefined {
    return this._data?.body;
  }

  public get title(): string | undefined {
    return this._data?.title;
  }

  // Note: _data.labels is Label[], but this.labels returns string[].
  public get labels(): string[] | undefined {
    const labels = this._data?.labels;

    if (labels === undefined) {
      return;
    }

    return labels
      .map((label: Label) => label.name)
      .filter((item) => item !== undefined) as string[];
  }

  public get id() {
    return this._data?.id;
  }

  public commentsByHeadings() {
    const headings: Record<string, string[]> = {};
    let currentHeading = "";
    const headingRegex = /^(#+ .*?)$/m;

    if (this.comments === undefined) {
      return "";
    }

    for (const comment of this.comments) {
      const parts = comment.body?.split(headingRegex);

      if (parts === undefined) {
        continue;
      }

      for (const part of parts) {
        if (part === "") {
          continue;
        }

        if (part.match(headingRegex) != null) {
          currentHeading = part;
          continue;
        }

        if (headings[currentHeading] === undefined) {
          headings[currentHeading] = [];
        }

        headings[currentHeading].push(part.trim());
      }
    }
    let output = "";
    for (const heading in headings) {
      output += `${heading}\n\n`;
      for (const line of headings[heading]) {
        output += `${line}\n\n`;
      }
    }

    return output;
  }

  public rollup(downloadUrl?: string) {
    let md = "";

    if (this.comments === undefined) {
      return;
    }

    if (downloadUrl !== undefined) {
      md += `[Download rollup](${downloadUrl})\n\n`;
    }

    if (getInput("group_by_headings") === "true") {
      md = this.commentsByHeadings();
    } else {
      for (const comment of this.comments) {
        md += `From: ${comment.user?.login}\n\n${comment.body}\n\n`;
      }
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
    const artifact = new DefaultArtifactClient();

    const { id } = await artifact.uploadArtifact(
      "rollup.docx",
      ["rollup.docx"],
      ".",
      {
        retentionDays: 7,
      },
    );

    return id;
  }

  public getUploadedRollupUrl(id?: number) {
    const runID = process.env.GITHUB_RUN_ID;

    if (runID === undefined) {
      return;
    }

    if (id === undefined) {
      return `https://github.com/${this.owner}/${this.repoName}/actions/runs/${runID}#:~:text=rollup.docx`;
    } else {
      return `https://github.com/${this.owner}/${this.repoName}/suites/${runID}/artifacts/${id}`;
    }
  }

  // Returns true if the issue has the given label
  public hasLabel(label: string): boolean {
    if (this.labels === undefined) {
      return false;
    }

    return this.labels?.some((candidate: string) => candidate === label);
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

    if (rollup === undefined) {
      return this.body;
    }

    rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;

    if (this.body?.match(rollupRegex) != null) {
      body = this.body.replace(rollupRegex, rollup);
    } else {
      body = `${this.body}\n\n${rollup}`;
    }

    return body;
  }
}
