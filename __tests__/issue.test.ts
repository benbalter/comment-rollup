import { expect, test } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { mockIssueData, octokit, sandbox, mockCommentData } from "./fixtures";
import { Issue } from "../src/issue";

const repo = `${faker.company.buzzNoun()}/${faker.company.buzzNoun()}`;
const number = faker.number.int();
const issueData = mockIssueData();
const issue = new Issue(repo, number, octokit);

const expectations = {
  repository: repo,
  repoName: repo.split("/")[1],
  owner: repo.split("/")[0],
  number: number,
  body: issueData.body,
  title: issueData.title,
  labels: issueData.labels.map((node: { name: string }) => node.name),
};
type IssueKey = keyof Issue;

test("returns Octokit", () => {
  expect(issue.octokit).toBeDefined();
});

describe("getData", () => {
  beforeAll(() => {
    const url = `https://api.github.com/repos/${repo}/issues/${number}`;
    sandbox.mock(
      {
        method: "GET",
        url: url,
      },
      issueData,
      { sendAsJson: true },
    );
    return issue.getData();
  });

  test("sets data", () => {
    expect(issue._data).toBeDefined();
  });

  for (const [key, value] of Object.entries(expectations)) {
    test(`returns ${key}`, () => {
      expect(issue[key as IssueKey]).toEqual(value);
    });
  }
});

describe("getComments", () => {
  beforeAll(async () => {
    sandbox.restore();
    const comments = [mockCommentData(), mockCommentData(), mockCommentData()];
    const commentUrl = `https://api.github.com/repos/${repo}/issues/${number}/comments`;
    sandbox.mock(
      {
        method: "GET",
        url: commentUrl,
      },
      comments,
      { sendAsJson: true },
    );
    await issue.getComments();

    const url = `https://api.github.com/repos/${repo}/issues/${number}`;
    sandbox.mock(
      {
        method: "GET",
        url: url,
      },
      issueData,
      { sendAsJson: true },
    );
    return issue.getData();
  });

  test("sets comments", () => {
    expect(issue.comments).toBeDefined();

    if (issue.comments) {
      expect(issue.comments.length).toEqual(3);
    }
  });
});
