"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.run = exports.issueBody = exports.hasLabel = void 0;
const github_1 = __importDefault(require("@actions/github"));
const core = __importStar(require("@actions/core"));
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
        const token = core.getInput("token", { required: true });
        const label = core.getInput("label");
        const issueNumber = parseInt(core.getInput("issue_number", { required: true }), 10);
        const context = github_1.default.context;
        const octokit = github_1.default.getOctokit(token);
        const octokitArgs = Object.assign(Object.assign({}, context.repo), { issue_number: issueNumber });
        const { data: issue } = yield octokit.rest.issues.get(octokitArgs);
        if (label && !hasLabel(issue.labels, label)) {
            core.info(`Issue ${issue.title} does not have label ${label}. Skipping.`);
            return;
        }
        const { data: comments } = yield octokit.rest.issues.listComments(octokitArgs);
        if (comments.length === 0) {
            core.warning(`Issue ${issue.title} does not have any comments. Skipping.`);
            return;
        }
        const body = issueBody(issue, comments);
        core.setOutput("body", body);
        octokit.rest.issues.update(Object.assign(Object.assign({}, octokitArgs), { body }));
        core.notice(`Rolled up ${comments.length} comments to issue ${issue.title}`);
    });
}
exports.run = run;
try {
    run();
}
catch (error) {
    if (error instanceof Error)
        core.setFailed(error.message);
}
