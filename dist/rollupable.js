"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rollupable = void 0;
const remark_html_1 = __importDefault(require("remark-html"));
const remark_parse_1 = __importDefault(require("remark-parse"));
const unified_1 = require("unified");
const html_to_docx_1 = __importDefault(require("html-to-docx"));
const core_1 = require("@actions/core");
const utils_1 = require("@actions/github/lib/utils");
const plugin_paginate_graphql_1 = require("@octokit/plugin-paginate-graphql");
const fs_1 = require("fs");
const artifact_1 = require("@actions/artifact");
const console_1 = require("console");
const summary = "Comment rollup";
const rollupRegex = new RegExp(`<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`, "im");
class Rollupable {
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
        const OctokitWithPaginate = utils_1.GitHub.plugin(plugin_paginate_graphql_1.paginateGraphql);
        const token = (0, core_1.getInput)("token", { required: true });
        this.octokit = new OctokitWithPaginate((0, utils_1.getOctokitOptions)(token));
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
        return labels.map((label) => label.name).filter(item => item !== undefined);
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
        if ((0, core_1.getInput)("group_by_headings") === "true") {
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
        return await (0, unified_1.unified)()
            .use(remark_parse_1.default)
            .use(remark_html_1.default)
            .process(this.rollup());
    }
    async docxRollup() {
        const html = await this.htmlRollup();
        return await (0, html_to_docx_1.default)(String(html.toString()));
    }
    async writeRollup() {
        (0, console_1.info)("Writing rollup to disk");
        const docx = (await this.docxRollup());
        (0, fs_1.writeFileSync)("rollup.docx", docx);
    }
    async uploadRollup() {
        await this.writeRollup();
        (0, console_1.info)("Uploading rollup as artifact");
        const artifact = new artifact_1.DefaultArtifactClient();
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
exports.Rollupable = Rollupable;
