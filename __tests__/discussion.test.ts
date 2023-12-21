import { expect, test } from "@jest/globals";
// @ts-ignore
import { Discussion } from "../src/discussion";
import {
  octokit,
  mockDiscussionData,
  mockGraphQL,
  mockCommentData,
  sandbox,
} from "./fixtures";
import { before } from "node:test";
import fetchMock from "fetch-mock";

const discussionData = mockDiscussionData();
const repo = `${discussionData.owner.login}/${discussionData.repo.name}`;
const discussion = new Discussion(repo, discussionData.number, octokit);

const expectations = {
  repository: `${discussionData.owner.login}/${discussionData.repo.name}`,
  repoName: discussionData.repo.name,
  owner: discussionData.owner.login,
  number: discussionData.number,
  body: discussionData.body,
  title: discussionData.title,
  id: discussionData.id,
  labels: discussionData.labels.nodes.map(
    (node: { name: string }) => node.name,
  ),
};
type DiscussionKey = keyof Discussion;

test("returns Octokit", () => {
  expect(discussion.octokit).toBeDefined();
});

describe("getData", () => {
  beforeAll(() => {
    const data = {
      data: {
        repository: {
          discussion: discussionData,
        },
      },
    };
    mockGraphQL(data, "discussion", discussionData.number.toString());
    return discussion.getData();
  });

  test("sets data", async () => {
    expect(discussion._data).toBeDefined();
  });

  for (const [key, value] of Object.entries(expectations)) {
    test(`returns ${key}`, () => {
      expect(discussion[key as DiscussionKey]).toEqual(value);
    });
  }
});

describe("getComments", () => {
  beforeAll(async () => {
    sandbox.restore();
    const comments = [mockCommentData(), mockCommentData(), mockCommentData()];

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
    mockGraphQL(commentData, "comments", "comments");

    const data = {
      data: {
        repository: {
          discussion: discussionData,
        },
      },
    };
    mockGraphQL(
      data,
      "discussionForComments",
      discussionData.number.toString(),
    );

    await discussion.getData();
    return discussion.getComments();
  });

  test("sets comments", () => {
    expect(discussion.comments).toBeDefined();

    if (discussion.comments) {
      expect(discussion.comments.length).toEqual(3);
    }
  });
});
