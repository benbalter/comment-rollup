"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    constructor(repository, number) {
        this._repository = repository;
        this._number = number;
        const OctokitWithPaginate = utils_1.GitHub.plugin(plugin_paginate_graphql_1.paginateGraphql);
        const token = (0, core_1.getInput)("token", { required: true });
        this._octokit = new OctokitWithPaginate((0, utils_1.getOctokitOptions)(token));
    }
    get octokit() {
        return this._octokit;
    }
    get repository() {
        return this._repository;
    }
    get number() {
        return this._number;
    }
    get repoName() {
        return this.repository.split("/")[1];
    }
    get owner() {
        return this.repository.split("/")[0];
    }
    get comments() {
        return this._comments;
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
        return (_a = this._data) === null || _a === void 0 ? void 0 : _a.labels.map((label) => label.name);
    }
    get id() {
        var _a;
        return (_a = this._data) === null || _a === void 0 ? void 0 : _a.id;
    }
    commentsByHeadings() {
        const headings = {};
        let currentHeading = "";
        const headingRegex = /^(#+ .*?)$/m;
        if (this.comments === undefined) {
            return "";
        }
        for (const comment of this.comments) {
            const parts = comment.body.split(headingRegex);
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
                md += `From: ${comment.user.login}\n\n${comment.body}\n\n`;
            }
        }
        return md;
    }
    htmlRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, unified_1.unified)()
                .use(remark_parse_1.default)
                .use(remark_html_1.default)
                .process(this.rollup());
        });
    }
    docxRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            const html = yield this.htmlRollup();
            return yield (0, html_to_docx_1.default)(String(html.toString()));
        });
    }
    writeRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, console_1.info)("Writing rollup to disk");
            const docx = (yield this.docxRollup());
            (0, fs_1.writeFileSync)("rollup.docx", docx);
        });
    }
    uploadRollup() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.writeRollup();
            (0, console_1.info)("Uploading rollup as artifact");
            const artifactClient = (0, artifact_1.create)();
            const name = "rollup.docx";
            const files = ["rollup.docx"];
            const rootDirectory = ".";
            const options = {
                retentionDays: 7,
            };
            return yield artifactClient.uploadArtifact(name, files, rootDirectory, options);
        });
    }
    // Artifact V2 should return the ID in the response. Until then...
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
exports.Rollupable = Rollupable;
