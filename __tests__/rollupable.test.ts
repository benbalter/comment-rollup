import { expect, test } from "@jest/globals";
import { Discussion } from "../src/discussion";
import { octokit, mockDiscussionData, mockGraphQL, mockCommentData, sandbox } from "./fixtures";
import { before } from "node:test";
import fetchMock from "fetch-mock";

