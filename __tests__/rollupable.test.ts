import { expect, test } from "@jest/globals";
import {
  octokit,
  mockIssueData,
  mockGraphQL,
  mockCommentData,
  sandbox,
} from "./fixtures";
import { before } from "node:test";
import fetchMock from "fetch-mock";
import { faker } from "@faker-js/faker";
// @ts-ignore
import { Issue } from "../dist/issue";
import { Comment } from "../src/rollupable";

// Note: we're using an issue here, but this is shared logic
const repo = `${faker.company.buzzNoun()}/${faker.company.buzzNoun()}`;
const number = faker.number.int();
const issueData = mockIssueData();
const issue = new Issue(repo, number, octokit);

describe("Rollup", () => {
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

  test("returns true if label exists", () => {
    expect(issue.hasLabel(issueData.labels[0].name)).toBe(true);
  });

  test("returns false if label does not exist", () => {
    expect(issue.hasLabel("foo123")).toBe(false);
  });

  test("returns the rollup", () => {
    expect(issue.rollup).toBeDefined();
    const expected = issue.comments?.map((comment: Comment) => {
      return `From: ${comment.user?.login}\n\n${comment.body}\n\n`;
    });
    expect(issue.rollup()).toEqual(expected);
  });

  test("return the HTML rollup", () => {
    expect(issue.htmlRollup).toBeDefined();
  });

  test("returns the DOCX rollup", () => {
    expect(issue.docxRollup).toBeDefined();
  });
});
