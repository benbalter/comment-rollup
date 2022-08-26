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
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.issueBody = exports.hasLabel = void 0;
const github_1 = require("@actions/github");
const core_1 = require("@actions/core");
require("dotenv/config");
const summary = "Comment rollup";
function hasLabel(labels, label) {
    let labelArray;
    if (typeof labels === "string") {
        labelArray = Array({ name: labels });
    }
    else {
        labelArray = labels;
    }
    return labelArray.some((candidate) => candidate.name === label);
}
exports.hasLabel = hasLabel;
function issueBody(issue, comments) {
    var _a;
    const rollupRegex = new RegExp(`<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`, "im");
    let body;
    let rollup = comments.map((comment) => comment.body).join("\n\n");
    rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;
    if ((_a = issue.body) === null || _a === void 0 ? void 0 : _a.match(rollupRegex)) {
        body = issue.body.replace(rollupRegex, rollup);
    }
    else {
        body = `${issue.body}\n\n${rollup}`;
    }
    return body;
}
exports.issueBody = issueBody;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = (0, core_1.getInput)("token", { required: true });
        const label = (0, core_1.getInput)("label");
        const issueNumber = parseInt((0, core_1.getInput)("issue_number", { required: true }), 10);
        const context = github_1.context;
        const octokit = (0, github_1.getOctokit)(token);
        const octokitArgs = Object.assign(Object.assign({}, context.repo), { issue_number: issueNumber });
        const { data: issue } = yield octokit.rest.issues.get(octokitArgs);
        if (label && !hasLabel(issue.labels, label)) {
            (0, core_1.info)(`Issue ${issue.title} does not have label ${label}. Skipping.`);
            return;
        }
        const { data: comments } = yield octokit.rest.issues.listComments(octokitArgs);
        if (comments.length === 0) {
            (0, core_1.warning)(`Issue ${issue.title} does not have any comments. Skipping.`);
            return;
        }
        const body = issueBody(issue, comments);
        (0, core_1.setOutput)("body", body);
        octokit.rest.issues.update(Object.assign(Object.assign({}, octokitArgs), { body }));
        (0, core_1.notice)(`Rolled up ${comments.length} comments to issue ${issue.title}`);
    });
}
exports.run = run;
try {
    run();
}
catch (error) {
    if (error instanceof Error)
        (0, core_1.setFailed)(error.message);
}
