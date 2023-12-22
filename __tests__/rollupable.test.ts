import { expect, test } from "@jest/globals";
import {
  octokit,
  mockIssueData,
  mockGraphQL,
  mockCommentData,
  sandbox,
  mockDiscussionData,
} from "./fixtures";
import { before } from "node:test";
import fetchMock from "fetch-mock";
import { faker } from "@faker-js/faker";
import { Issue } from "../src/issue";
import { Comment } from "../src/rollupable";
import { Discussion } from "../src/discussion";
import { existsSync } from "node:fs";

const repo = `${faker.company.buzzNoun()}/${faker.company.buzzNoun()}`;
const number = faker.number.int();
const issueData = mockIssueData();
const issue = new Issue(repo, number, octokit);
const discussionData = mockDiscussionData();
const discussion = new Discussion(repo, discussionData.number, octokit);
const comments = [mockCommentData(), mockCommentData(), mockCommentData()];

const mocks = {
  issue: issue,
  discussion: discussion,
};

describe("Rollup", () => {
  beforeAll(async () => {
    const url = `https://api.github.com/repos/${repo}/issues/${number}`;
    sandbox.mock(
      {
        method: "GET",
        url: url,
      },
      issueData,
      { sendAsJson: true },
    );
    await issue.getData();

    const commentData = {
      data: {
        repository: {
          discussion: {
            comments: {
              nodes: comments,
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      },
    };
    await mockGraphQL(commentData, "comments", "comments");
    await discussion.getComments();

    const data = {
      data: {
        repository: {
          discussion: discussionData,
        },
      },
    };
    mockGraphQL(data, "discussion", discussionData.number.toString());
    await discussion.getData();

    const commentUrl = `https://api.github.com/repos/${repo}/issues/${number}/comments`;
    sandbox.mock(
      {
        method: "GET",
        url: commentUrl,
      },
      comments,
      { sendAsJson: true },
    );
    return issue.getComments();
  });

  // run tests for both issue and discussion
  for (const [type, mock] of Object.entries(mocks)) {
    describe(type, () => {
      test("returns true if label exists", () => {
        expect(mock.labels).toBeDefined();
        if (mock.labels === undefined) {
          return;
        }
        expect(mock.hasLabel(mock.labels[0])).toBe(true);
      });

      test("returns false if label does not exist", () => {
        expect(mock.hasLabel("foo123")).toBe(false);
      });

      test("returns the rollup", () => {
        const rollup = mock.rollup();
        expect(rollup).toBeDefined();
        const expected = mock.comments
          ?.map((comment: Comment) => {
            return `From: ${comment.user?.login}\n\n${comment.body}\n\n`;
          })
          .join("");
        expect(rollup).toEqual(expected);
      });

      test("return the HTML rollup", async () => {
        const html = await mock.htmlRollup();
        expect(html.toString()).toMatch(/<p>From:/);
      });

      test("returns the DOCX rollup", async () => {
        const docx = await mock.docxRollup();
        expect(docx).toBeDefined();
      });

      test("comments by heading", () => {
        // TODO
      });

      test("writes the rollup to disk", async () => {
        await mock.writeRollup();
        const exists = existsSync("rollup.docx");
        expect(exists).toBe(true);
      });

      test("uploads the rolloup", async () => {
        // TODO
      });

      test("gets uploaded rollup URL", async () => {
        process.env.GITHUB_RUN_ID = "123";
        const url = await mock.getUploadedRollupUrl(456);
        expect(url).toEqual(
          `https://github.com/${mock.owner}/${mock.repoName}/actions/runs/123/artifacts/456`,
        );
      });

      test("updates the body with the rollup", () => {
        // TODO
      });
    });
  }
});
