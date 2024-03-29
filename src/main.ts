import { context as githubContext } from "@actions/github";
import {
  getInput,
  info,
  debug,
  warning,
  notice,
  setFailed,
} from "@actions/core";
import "dotenv/config";
import { Issue } from "./issue";
import { Discussion } from "./discussion";
import { type Rollupable } from "./rollupable";

function parseContext() {
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

  return { number, rollupableType };
}

async function run(): Promise<void> {
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
    debug(`Labels: ${rollupable.labels}`);
    return;
  }

  await rollupable.getComments();
  if (rollupable.comments?.length === 0) {
    warning(
      `${rollupableType} ${rollupable.title} does not have any comments. Skipping.`,
    );
    return;
  }

  let uploadedRollupUrl: string | undefined;
  if (getInput("LINK_TO_DOC") === "true") {
    const uploadId = await rollupable.uploadRollup();
    uploadedRollupUrl = rollupable.getUploadedRollupUrl(uploadId);
    info(`Uploaded rollup to ${uploadedRollupUrl}`);
  } else {
    uploadedRollupUrl = undefined;
  }

  await rollupable.updateBody(uploadedRollupUrl);
  notice(
    `Rolled up ${rollupable.comments?.length} comments to ${rollupableType} ${rollupable.title}`,
  );
}

try {
  run();
} catch (error) {
  if (error instanceof Error) setFailed(error.message);
}

export { run };
