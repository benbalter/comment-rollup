import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import HTMLtoDOCX from "html-to-docx";
import { getInput, info, warning } from "@actions/core";

import { writeFileSync } from "fs";
import { type Buffer } from "buffer";
import { DefaultArtifactClient } from "@actions/artifact";
import { type VFile } from "vfile";

const summary = "Comment rollup";
const startMarker = "<!-- comment-rollup:start -->";
const endMarker = "<!-- comment-rollup:end -->";
const rollupRegex = new RegExp(`${startMarker}[\\s\\S]*${endMarker}`);

// Rollups written before the markers were added. Greedy, since comments may
// contain their own <details> blocks and the rollup was always appended last.
const legacyRollupRegex = new RegExp(
  `<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*</details>`,
  "i",
);

// GitHub rejects issue and discussion bodies longer than this
export const MAX_BODY_LENGTH = 65536;

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
  docxRollup: () => Promise<Buffer | Blob | undefined>;
  writeRollup: () => Promise<void>;
  uploadRollup: () => Promise<number | undefined>;
  getUploadedRollupUrl: (id?: number) => string | undefined;
  hasLabel: (label: string) => boolean;
  getData: () => Promise<void>;
  getComments: () => Promise<void>;
  bodyWithRollup: (rollup: string) => string;
  bodyWithoutRollup: () => string | undefined;
  clearRollup: () => Promise<string | null | undefined>;
}

export abstract class Rollupable implements RollupableClass {
  _data: RollupableData | undefined;
  repository: string;
  number: number;
  comments: Comment[] | undefined;
  owner: string;
  repoName: string;

  public constructor(repository: string, number: number) {
    this.repository = repository;
    this.number = number;

    const parts = repository.split("/");
    this.owner = parts[0];
    this.repoName = parts[1];
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
        if (part.trim() === "") {
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

    if (
      getInput("group_by_heading") === "true" ||
      getInput("group_by_headings") === "true"
    ) {
      md += this.commentsByHeadings();
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
    return await HTMLtoDOCX(html.toString());
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
      return `https://github.com/${this.owner}/${this.repoName}/actions/runs/${runID}/artifacts/${id}`;
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

  public async updateBody(
    _downloadUrl?: string,
  ): Promise<string | null | undefined> {
    throw new Error("Not implemented");
  }

  // Writes the given body back to the issue or discussion.
  protected async writeBody(_body: string): Promise<string | null | undefined> {
    throw new Error("Not implemented");
  }

  // Removes any existing rollup from the body and writes the body back.
  // Returns undefined, writing nothing, when the body has no rollup.
  public async clearRollup(): Promise<string | null | undefined> {
    const body = this.bodyWithoutRollup();
    if (body === undefined) {
      return undefined;
    }
    return this.writeBody(body);
  }

  // Returns the body with any existing rollup removed, or undefined when the
  // body has no rollup (either the marker form or the legacy <details> form),
  // so callers can skip the write.
  public bodyWithoutRollup(): string | undefined {
    const body = this.body ?? "";
    const match = body.match(rollupRegex) ?? body.match(legacyRollupRegex);
    if (match === null || match.index === undefined) {
      return undefined;
    }
    // The rollup is always appended after the original body, so drop the
    // block and the blank line that separated it from the body.
    const before = body.slice(0, match.index).replace(/\s+$/, "");
    const after = body.slice(match.index + match[0].length).replace(/^\s+/, "");
    if (before === "") {
      return after;
    }
    if (after === "") {
      return before;
    }
    return `${before}\n\n${after}`;
  }

  public bodyWithRollup(downloadUrl?: string): string {
    if (this.body === undefined) {
      throw new Error("Rollupable body is undefined");
    }

    const rollup = this.rollup(downloadUrl);

    if (rollup === undefined) {
      return this.body;
    }

    let body = this.replaceRollup(rollup);

    if (body.length > MAX_BODY_LENGTH) {
      warning(
        `Rollup would exceed GitHub's ${MAX_BODY_LENGTH} character limit. Omitting it from the body.`,
      );
      let notice = "Rollup is too large to display inline.";
      if (downloadUrl !== undefined) {
        notice += ` [Download rollup](${downloadUrl})`;
      }
      body = this.replaceRollup(notice);
    }

    return body;
  }

  private replaceRollup(content: string): string {
    const body = this.body ?? "";
    const block = `${startMarker}\n<details><summary>${summary}</summary>\n\n${content}\n\n</details>\n${endMarker}`;

    // Replacer functions keep `$` sequences in comments from being treated as patterns
    if (rollupRegex.test(body)) {
      return body.replace(rollupRegex, () => block);
    }

    if (legacyRollupRegex.test(body)) {
      return body.replace(legacyRollupRegex, () => block);
    }

    if (body === "") {
      return block;
    }

    return `${body}\n\n${block}`;
  }
}
