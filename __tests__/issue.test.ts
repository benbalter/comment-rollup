import { expect, test } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { mockIssueData, mockCommentData } from "../src/fixtures.js";
import { Issue } from "../src/issue.js";
import { sandbox } from "../src/octokit.js";

const repo = `${faker.company.buzzNoun()}/${faker.company.buzzNoun()}`;
const number = faker.number.int();
const issueData = mockIssueData();
const issue = new Issue(repo, number);

const expectations = {
  repository: repo,
  repoName: repo.split("/")[1],
  owner: repo.split("/")[0],
  number,
  body: issueData.body,
  title: issueData.title,
  labels: issueData.labels.map((node: { name: string }) => node.name),
};
type IssueKey = keyof Issue;

describe("getData", () => {
  beforeEach(async () => {
    sandbox.removeRoutes();
    sandbox.clearHistory();
    const url = `https://api.github.com/repos/${repo}/issues/${number}`;
    sandbox.route({
      method: "GET",
      url,
      response: {
        status: 200,
        body: issueData,
      },
    });
    await issue.getData();
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
    sandbox.removeRoutes();
    sandbox.clearHistory();
    const comments = [mockCommentData(), mockCommentData(), mockCommentData()];
    const commentUrl = `https://api.github.com/repos/${repo}/issues/${number}/comments`;
    sandbox.route({
      method: "GET",
      url: commentUrl,
      response: {
        status: 200,
        body: comments,
      },
    });
    await issue.getComments();

    const url = `https://api.github.com/repos/${repo}/issues/${number}`;
    sandbox.route({
      method: "GET",
      url,
      response: {
        status: 200,
        body: issueData,
      },
    });
    await issue.getData();
  });

  test("sets comments", () => {
    expect(issue.comments).toBeDefined();

    if (issue.comments !== null && issue.comments !== undefined) {
      expect(issue.comments.length).toEqual(3);
    }
  });
});
