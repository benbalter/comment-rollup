var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { context as githubContext } from "@actions/github";
import { getInput, info, debug, warning, notice, setFailed, } from "@actions/core";
import "dotenv/config";
import { Issue } from "./issue";
import { Discussion } from "./discussion";
function parseContext() {
    var _a, _b;
    const types = ["issue", "discussion"];
    let number;
    let rollupableType = "";
    if (getInput("type") !== "" && getInput("number") !== "") {
        number = parseInt(getInput("number"), 10);
        rollupableType = getInput("type");
    }
    else if (githubContext.payload.issue !== undefined) {
        number = (_a = githubContext.payload.issue) === null || _a === void 0 ? void 0 : _a.number;
        rollupableType = "issue";
    }
    else if (githubContext.payload.discussion !== undefined) {
        number = (_b = githubContext.payload.discussion) === null || _b === void 0 ? void 0 : _b.number;
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
        const label = getInput("label");
        const { number, rollupableType } = parseContext();
        const repo = `${githubContext.repo.owner}/${githubContext.repo.repo}`;
        let rollupable;
        info(`Rolling up ${rollupableType} #${number} in ${repo}`);
        if (rollupableType === "issue") {
            rollupable = new Issue(repo, number);
        }
        else if (rollupableType === "discussion") {
            rollupable = new Discussion(repo, number);
        }
        else {
            throw new Error(`Unknown rollupable type ${rollupableType}`);
        }
        yield rollupable.getData();
        if (label !== undefined && label !== "" && !rollupable.hasLabel(label)) {
            info(`${rollupableType} ${rollupable.title} does not have label ${label}. Skipping.`);
            debug(`Labels: ${rollupable.labels}`);
            return;
        }
        yield rollupable.getComments();
        if (((_a = rollupable.comments) === null || _a === void 0 ? void 0 : _a.length) === 0) {
            warning(`${rollupableType} ${rollupable.title} does not have any comments. Skipping.`);
            return;
        }
        let uploadedRollupUrl;
        if (getInput("LINK_TO_DOC") === "true") {
            const uploadId = yield rollupable.uploadRollup();
            uploadedRollupUrl = rollupable.getUploadedRollupUrl(uploadId);
            info(`Uploaded rollup to ${uploadedRollupUrl}`);
        }
        else {
            uploadedRollupUrl = undefined;
        }
        yield rollupable.updateBody(uploadedRollupUrl);
        notice(`Rolled up ${(_b = rollupable.comments) === null || _b === void 0 ? void 0 : _b.length} comments to ${rollupableType} ${rollupable.title}`);
    });
}
try {
    run();
}
catch (error) {
    if (error instanceof Error)
        setFailed(error.message);
}
export { run };
