import { context as githubContext, getOctokit } from "@actions/github";
import { getInput, info, warning, notice, setFailed } from "@actions/core";
import "dotenv/config";
import { Issue } from "./issue";
import { type Octokit } from "octokit";

const summary = "Comment rollup";
const rollupRegex = new RegExp(
  `<details>\\s*<summary>\\s*${summary}\\s*</summary>[\\s\\S]*?</details>`,
  "im",
);

// Returns the issue body with the comments rolled up into a single details tag
function issueBody(issue: Issue): string {
  if (issue.body === undefined) {
    throw new Error("Issue body is undefined");
  }

  let body: string;
  let rollup = issue.comments.map((comment) => comment.body).join("\n\n");
  rollup = `<details><summary>${summary}</summary>\n\n${rollup}\n\n</details>`;

  if (issue.body?.match(rollupRegex) != null) {
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
    10,
  );

  const octokit = getOctokit(token) as Octokit;
  const repo = `${githubContext.repo.owner}/${githubContext.repo.repo}`;
  const issue = new Issue(octokit, repo, issueNumber);
  await issue.getData();

  if (label !== undefined && !issue.hasLabel(label)) {
    info(`Issue ${issue.title} does not have label ${label}. Skipping.`);
    return;
  }

  await issue.getComments();
  if (issue.comments.length === 0) {
    warning(`Issue ${issue.title} does not have any comments. Skipping.`);
    return;
  }

  const body = issueBody(issue);
  await issue.updateBody(body);
  notice(`Rolled up ${issue.comments.length} comments to issue ${issue.title}`);
}

try {
  run();
} catch (error) {
  if (error instanceof Error) setFailed(error.message);
}

export { run };
