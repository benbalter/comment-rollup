import { context as github_context, getOctokit } from "@actions/github";
import {
  getInput,
  info,
  warning,
  setOutput,
  notice,
  setFailed,
} from "@actions/core";
import "dotenv/config";

const summary = "Comment rollup";

function hasLabel(
  labels: (string | { name?: string })[],
  label: string
): boolean {
  let labelArray: { name?: string }[];

  if (typeof labels === "string") {
    labelArray = Array({ name: labels });
  } else {
    labelArray = <{ name?: string }[]>labels;
  }

  return labelArray.some((candidate) => candidate.name === label);
}

function issueBody(
  issue: { body?: string | null },
  comments: { body?: string }[]
): string {
  const rollupRegex = new RegExp(
    `<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`,
    "im"
  );
  let body: string;
  let rollup = comments.map((comment) => comment.body).join("\n\n");
  rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;

  if (issue.body?.match(rollupRegex)) {
    body = issue.body.replace(rollupRegex, rollup);
  } else {
    body = `${issue.body}\n\n${rollup}`;
  }

  return body;
}

async function run(): Promise<void> {
  const token = getInput("token", { required: true });
  const label = getInput("label");
  const issueNumber = parseInt(
    getInput("issue_number", { required: true }),
    10
  );

  const context = github_context;
  const octokit = getOctokit(token);
  const octokitArgs = {
    ...context.repo,
    issue_number: issueNumber,
  };

  const { data: issue } = await octokit.rest.issues.get(octokitArgs);

  if (label && !hasLabel(issue.labels, label)) {
    info(`Issue ${issue.title} does not have label ${label}. Skipping.`);
    return;
  }

  const { data: comments } = await octokit.rest.issues.listComments(
    octokitArgs
  );

  if (comments.length === 0) {
    warning(`Issue ${issue.title} does not have any comments. Skipping.`);
    return;
  }

  const body = issueBody(issue, comments);
  setOutput("body", body);
  octokit.rest.issues.update({ ...octokitArgs, body });
  notice(`Rolled up ${comments.length} comments to issue ${issue.title}`);
}

try {
  run();
} catch (error) {
  if (error instanceof Error) setFailed(error.message);
}

export { hasLabel, issueBody, run };
