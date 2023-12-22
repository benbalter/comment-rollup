var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import HTMLtoDOCX from "html-to-docx";
import { getInput, setFailed } from "@actions/core";
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
import { writeFileSync } from "fs";
import { DefaultArtifactClient } from "@actions/artifact";
import { info } from "console";
const summary = "Comment rollup";
const rollupRegex = new RegExp(`<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`, "im");
export class Rollupable {
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
        var _a;
        return (_a = this._data) === null || _a === void 0 ? void 0 : _a.body;
    }
    get title() {
        var _a;
        return (_a = this._data) === null || _a === void 0 ? void 0 : _a.title;
    }
    // Note: _data.labels is Label[], but this.labels returns string[].
    get labels() {
        var _a;
        const labels = (_a = this._data) === null || _a === void 0 ? void 0 : _a.labels;
        if (labels === undefined) {
            return;
        }
        return labels
            .map((label) => label.name)
            .filter((item) => item !== undefined);
    }
    get id() {
        var _a;
        return (_a = this._data) === null || _a === void 0 ? void 0 : _a.id;
    }
    commentsByHeadings() {
        var _a;
        const headings = {};
        let currentHeading = "";
        const headingRegex = /^(#+ .*?)$/m;
        if (this.comments === undefined) {
            return "";
        }
        for (const comment of this.comments) {
            const parts = (_a = comment.body) === null || _a === void 0 ? void 0 : _a.split(headingRegex);
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
        var _a;
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
                md += `From: ${(_a = comment.user) === null || _a === void 0 ? void 0 : _a.login}\n\n${comment.body}\n\n`;
            }
        }
        return md;
    }
    htmlRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield unified()
                .use(remarkParse)
                .use(remarkHtml)
                .process(this.rollup());
        });
    }
    docxRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            const html = yield this.htmlRollup();
            if (html === undefined) {
                setFailed("Could not convert rollup to HTML");
                return;
            }
            return yield HTMLtoDOCX(html.toString());
        });
    }
    writeRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            info("Writing rollup to disk");
            const docx = (yield this.docxRollup());
            writeFileSync("rollup.docx", docx);
        });
    }
    uploadRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.writeRollup();
            info("Uploading rollup as artifact");
            const artifact = new DefaultArtifactClient();
            const { id } = yield artifact.uploadArtifact("rollup.docx", ["rollup.docx"], ".", {
                retentionDays: 7,
            });
            return id;
        });
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
        var _a;
        if (this.labels === undefined) {
            return false;
        }
        return (_a = this.labels) === null || _a === void 0 ? void 0 : _a.some((candidate) => candidate === label);
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
    getComments() {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
    updateBody(downloadUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error("Not implemented");
        });
    }
    bodyWithRollup(downloadUrl) {
        var _a;
        if (this.body === undefined) {
            throw new Error("Rollupable body is undefined");
        }
        let body;
        let rollup = this.rollup(downloadUrl);
        if (rollup === undefined) {
            return this.body;
        }
        rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;
        if (((_a = this.body) === null || _a === void 0 ? void 0 : _a.match(rollupRegex)) != null) {
            body = this.body.replace(rollupRegex, rollup);
        }
        else {
            body = `${this.body}\n\n${rollup}`;
        }
        return body;
    }
}
