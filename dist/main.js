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
exports.run = void 0;
const github_1 = require("@actions/github");
const core_1 = require("@actions/core");
require("dotenv/config");
const issue_1 = require("./issue");
const discussion_1 = require("./discussion");
function parseContext() {
    var _a, _b;
    const types = ["issue", "discussion"];
    let number;
    let rollupableType = "";
    if ((0, core_1.getInput)("type") !== "" && (0, core_1.getInput)("number") !== "") {
        number = parseInt((0, core_1.getInput)("number"), 10);
        rollupableType = (0, core_1.getInput)("type");
    }
    else if (github_1.context.payload.issue !== undefined) {
        number = (_a = github_1.context.payload.issue) === null || _a === void 0 ? void 0 : _a.number;
        rollupableType = "issue";
    }
    else if (github_1.context.payload.discussion !== undefined) {
        number = (_b = github_1.context.payload.discussion) === null || _b === void 0 ? void 0 : _b.number;
        rollupableType = "discussion";
    }
    if (!types.includes(rollupableType)) {
        throw new Error(`Unknown rollupable type ${rollupableType}`);
    }
    if (number === undefined) {
        throw new Error("No issue or discussion found in payload");
    }
    return { number, rollupableType };
}
function run() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const label = (0, core_1.getInput)("label");
        const { number, rollupableType } = parseContext();
        const repo = `${github_1.context.repo.owner}/${github_1.context.repo.repo}`;
        let rollupable;
        (0, core_1.info)(`Rolling up ${rollupableType} #${number} in ${repo}`);
        if (rollupableType === "issue") {
            rollupable = new issue_1.Issue(repo, number);
        }
        else if (rollupableType === "discussion") {
            rollupable = new discussion_1.Discussion(repo, number);
        }
        else {
            throw new Error(`Unknown rollupable type ${rollupableType}`);
        }
        yield rollupable.getData();
        if (label !== undefined && label !== "" && !rollupable.hasLabel(label)) {
            (0, core_1.info)(`${rollupableType} ${rollupable.title} does not have label ${label}. Skipping.`);
            return;
        }
        yield rollupable.getComments();
        if (((_a = rollupable.comments) === null || _a === void 0 ? void 0 : _a.length) === 0) {
            (0, core_1.warning)(`${rollupableType} ${rollupable.title} does not have any comments. Skipping.`);
            return;
        }
        let uploadedRollupUrl;
        if ((0, core_1.getInput)("LINK_TO_DOC") === "true") {
            const response = yield rollupable.uploadRollup();
            if (response.failedItems.length > 0) {
                (0, core_1.setFailed)(`Failed to upload rollup: ${response.failedItems}`);
            }
            // Artifact V2 should return the ID in the response. Until then...
            (0, core_1.info)("Waiting 10 seconds for artifact to be available");
            yield new Promise((resolve) => setTimeout(resolve, 10000));
            uploadedRollupUrl = yield rollupable.getUploadedRollupUrl();
            (0, core_1.info)(`Uploaded rollup to ${uploadedRollupUrl}`);
        }
        else {
            uploadedRollupUrl = undefined;
        }
        yield rollupable.updateBody(uploadedRollupUrl);
        (0, core_1.notice)(`Rolled up ${(_b = rollupable.comments) === null || _b === void 0 ? void 0 : _b.length} comments to ${rollupableType} ${rollupable.title}`);
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
