import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import HTMLtoDOCX from "html-to-docx";
import { getInput, setFailed } from "@actions/core";
// @ts-ignore - not sure why this doesn't work
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
import { writeFileSync } from "fs";
import { DefaultArtifactClient } from "@actions/artifact";
import { info } from "console";
const summary = "Comment rollup";
const rollupRegex = new RegExp(`<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`, "im");
export class Rollupable {
    _data;
    octokit;
    repository;
    number;
    comments;
    owner;
    repoName;
    constructor(repository, number, octokit) {
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
        this.octokit = new OctokitWithPaginate(getOctokitOptions(token));
    }
    get body() {
        return this._data?.body;
    }
    get title() {
        return this._data?.title;
    }
    // Note: _data.labels is Label[], but this.labels returns string[].
    get labels() {
        const labels = this._data?.labels;
        if (labels === undefined) {
            return;
        }
        return labels
            .map((label) => label.name)
            .filter((item) => item !== undefined);
    }
    get id() {
        return this._data?.id;
    }
    commentsByHeadings() {
        const headings = {};
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
    rollup(downloadUrl) {
        let md = "";
        if (this.comments === undefined) {
            return;
        }
        if (downloadUrl !== undefined) {
            md += `[Download rollup](${downloadUrl})\n\n`;
        }
        if (getInput("group_by_headings") === "true") {
            md = this.commentsByHeadings();
        }
        else {
            for (const comment of this.comments) {
                md += `From: ${comment.user?.login}\n\n${comment.body}\n\n`;
            }
        }
        return md;
    }
    async htmlRollup() {
        return await unified()
            .use(remarkParse)
            .use(remarkHtml)
            .process(this.rollup());
    }
    async docxRollup() {
        const html = await this.htmlRollup();
        if (html === undefined) {
            setFailed("Could not convert rollup to HTML");
            return;
        }
        return await HTMLtoDOCX(html.toString());
    }
    async writeRollup() {
        info("Writing rollup to disk");
        const docx = (await this.docxRollup());
        writeFileSync("rollup.docx", docx);
    }
    async uploadRollup() {
        await this.writeRollup();
        info("Uploading rollup as artifact");
        const artifact = new DefaultArtifactClient();
        const { id } = await artifact.uploadArtifact("rollup.docx", ["rollup.docx"], ".", {
            retentionDays: 7,
        });
        return id;
    }
    getUploadedRollupUrl(id) {
        const runID = process.env.GITHUB_RUN_ID;
        if (runID === undefined) {
            return;
        }
        if (id === undefined) {
            return `https://github.com/${this.owner}/${this.repoName}/actions/runs/${runID}#:~:text=rollup.docx`;
        }
        else {
            return `https://github.com/${this.owner}/${this.repoName}/suites/${runID}/artifacts/${id}`;
        }
    }
    // Returns true if the issue has the given label
    hasLabel(label) {
        if (this.labels === undefined) {
            return false;
        }
        return this.labels?.some((candidate) => candidate === label);
    }
    async getData() {
        throw new Error("Not implemented");
    }
    async getComments() {
        throw new Error("Not implemented");
    }
    async updateBody(downloadUrl) {
        throw new Error("Not implemented");
    }
    bodyWithRollup(downloadUrl) {
        if (this.body === undefined) {
            throw new Error("Rollupable body is undefined");
        }
        let body;
        let rollup = this.rollup(downloadUrl);
        if (rollup === undefined) {
            return this.body;
        }
        rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;
        if (this.body?.match(rollupRegex) != null) {
            body = this.body.replace(rollupRegex, rollup);
        }
        else {
            body = `${this.body}\n\n${rollup}`;
        }
        return body;
    }
}
