"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const github_1 = require("@actions/github");
const core_1 = require("@actions/core");
require("dotenv/config");
const issue_js_1 = require("./issue.js");
const discussion_js_1 = require("./discussion.js");
function parseContext() {
    const types = ["issue", "discussion"];
    let number;
    let rollupableType = "";
    if ((0, core_1.getInput)("type") !== "" && (0, core_1.getInput)("number") !== "") {
        number = parseInt((0, core_1.getInput)("number"), 10);
        rollupableType = (0, core_1.getInput)("type");
    }
    else if (github_1.context.payload.issue !== undefined) {
        number = github_1.context.payload.issue?.number;
        rollupableType = "issue";
    }
    else if (github_1.context.payload.discussion !== undefined) {
        number = github_1.context.payload.discussion?.number;
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
async function run() {
    const label = (0, core_1.getInput)("label");
    const { number, rollupableType } = parseContext();
    const repo = `${github_1.context.repo.owner}/${github_1.context.repo.repo}`;
    let rollupable;
    (0, core_1.info)(`Rolling up ${rollupableType} #${number} in ${repo}`);
    if (rollupableType === "issue") {
        rollupable = new issue_js_1.Issue(repo, number);
    }
    else if (rollupableType === "discussion") {
        rollupable = new discussion_js_1.Discussion(repo, number);
    }
    else {
        throw new Error(`Unknown rollupable type ${rollupableType}`);
    }
    await rollupable.getData();
    if (label !== undefined &&
        label !== "" &&
        rollupable.hasLabel(label) === false) {
        (0, core_1.info)(`${rollupableType} ${rollupable.title} does not have label ${label}. Skipping.`);
        (0, core_1.debug)(`Labels: ${rollupable.labels}`);
        return;
    }
    await rollupable.getComments();
    if (rollupable.comments?.length === 0) {
        (0, core_1.warning)(`${rollupableType} ${rollupable.title} does not have any comments. Skipping.`);
        return;
    }
    let uploadedRollupUrl;
    if ((0, core_1.getInput)("LINK_TO_DOC") === "true") {
        const uploadId = await rollupable.uploadRollup();
        uploadedRollupUrl = rollupable.getUploadedRollupUrl(uploadId);
        (0, core_1.info)(`Uploaded rollup to ${uploadedRollupUrl}`);
    }
    else {
        uploadedRollupUrl = undefined;
    }
    await rollupable.updateBody(uploadedRollupUrl);
    (0, core_1.notice)(`Rolled up ${rollupable.comments?.length} comments to ${rollupableType} ${rollupable.title}`);
}
exports.run = run;
try {
    run();
}
catch (error) {
    if (error instanceof Error)
        (0, core_1.setFailed)(error.message);
}
