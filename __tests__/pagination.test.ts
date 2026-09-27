import { expect, test } from "@jest/globals";
import { mockCommentData, mockGraphQL, sandbox } from "./fixtures.js";
import { Issue } from "../src/issue.js";
import { Discussion } from "../src/discussion.js";

beforeEach(() => {
  sandbox.removeRoutes();
  sandbox.clearHistory();
});

test("fetches every page of issue comments", async () => {
  const commentUrl =
    "https://api.github.com/repos/owner/repo/issues/1/comments";
  const pageOne = Array.from({ length: 100 }, () => mockCommentData());
  const pageTwo = [mockCommentData(), mockCommentData()];

  // Routes match in order, so the more specific page 2 route goes first
  sandbox.route({
    method: "GET",
    url: `begin:${commentUrl}`,
    query: { page: "2" },
    response: { status: 200, body: pageTwo },
  });
  sandbox.route({
    method: "GET",
    url: `begin:${commentUrl}`,
    response: {
      status: 200,
      body: pageOne,
      headers: { link: `<${commentUrl}?per_page=100&page=2>; rel="next"` },
    },
  });

  const issue = new Issue("owner/repo", 1);
  await issue.getComments();

  expect(issue.comments).toHaveLength(102);
});

test("fetches every page of discussion comments", async () => {
  const pageOne = [mockCommentData(), mockCommentData()];
  const pageTwo = [mockCommentData()];
  const page = (nodes: object[], hasNextPage: boolean) => ({
    data: {
      repository: {
        discussion: {
          comments: {
            nodes,
            pageInfo: { hasNextPage, endCursor: hasNextPage ? "abc" : null },
          },
        },
      },
    },
  });

  mockGraphQL(page(pageTwo, false), "page2", '"cursor":"abc"');
  mockGraphQL(page(pageOne, true), "page1", "comments(first: 100");

  const discussion = new Discussion("owner/repo", 1);
  await discussion.getComments();

  expect(discussion.comments).toHaveLength(3);
});

test("attributes comments from deleted accounts to ghost", async () => {
  mockGraphQL(
    {
      data: {
        repository: {
          discussion: {
            comments: {
              nodes: [{ body: "orphaned", author: null }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      },
    },
    "comments",
    "comments",
  );

  const discussion = new Discussion("owner/repo", 1);
  await discussion.getComments();

  expect(discussion.comments?.[0].user?.login).toEqual("ghost");
});
