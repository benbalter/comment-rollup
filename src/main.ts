import { context as githubContext } from "@actions/github";
import {
  getInput,
  info,
  debug,
  warning,
  notice,
  setOutput,
} from "@actions/core";
import { Issue } from "./issue.js";
import { Discussion } from "./discussion.js";
import { type Rollupable } from "./rollupable.js";

export function parseContext() {
  const types = ["issue", "discussion"];
  let number: number | undefined;
  let rollupableType = "";

  if (getInput("type") !== "" && getInput("number") !== "") {
    number = parseInt(getInput("number"), 10);
    rollupableType = getInput("type");
  } else if (githubContext.payload.issue !== undefined) {
    number = githubContext.payload.issue?.number;
    rollupableType = "issue";
  } else if (githubContext.payload.discussion !== undefined) {
    number = githubContext.payload.discussion?.number;
    rollupableType = "discussion";
  }

  if (!types.includes(rollupableType)) {
    throw new Error(`Unknown rollupable type ${rollupableType}`);
  }

  if (number === undefined) {
    throw new Error("No issue or discussion found in payload");
  }

  if (Number.isNaN(number)) {
    throw new Error(`Invalid number ${getInput("number")}`);
  }

  return { number, rollupableType };
}

export async function run(): Promise<void> {
  const label = getInput("label");
  const { number, rollupableType } = parseContext();
  const repo = `${githubContext.repo.owner}/${githubContext.repo.repo}`;
  let rollupable: Rollupable;

  info(`Rolling up ${rollupableType} #${number} in ${repo}`);

  if (rollupableType === "issue") {
    rollupable = new Issue(repo, number);
  } else if (rollupableType === "discussion") {
    rollupable = new Discussion(repo, number);
  } else {
    throw new Error(`Unknown rollupable type ${rollupableType}`);
  }

  await rollupable.getData();

  if (label !== undefined && label !== "" && !rollupable.hasLabel(label)) {
    info(
      `${rollupableType} ${rollupable.title} does not have label ${label}. Skipping.`,
    );
    debug(`Labels: ${rollupable.labels?.join(", ")}`);
    return;
  }

  await rollupable.getComments();
  if (rollupable.comments?.length === 0) {
    const body = await rollupable.clearRollup();
    if (body === undefined) {
      warning(
        `${rollupableType} ${rollupable.title} does not have any comments. Skipping.`,
      );
      return;
    }
    setOutput("body", body ?? "");
    notice(`Removed stale rollup from ${rollupableType} ${rollupable.title}`);
    return;
  }

  let uploadedRollupUrl: string | undefined;
  if (getInput("link_to_doc") === "true") {
    const uploadId = await rollupable.uploadRollup();
    uploadedRollupUrl = rollupable.getUploadedRollupUrl(uploadId);
    info(`Uploaded rollup to ${uploadedRollupUrl}`);
  } else {
    uploadedRollupUrl = undefined;
  }

  const body = await rollupable.updateBody(uploadedRollupUrl);
  setOutput("body", body ?? "");
  notice(
    `Rolled up ${rollupable.comments?.length} comments to ${rollupableType} ${rollupable.title}`,
  );
}
