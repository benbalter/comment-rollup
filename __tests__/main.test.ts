import { expect, test } from "@jest/globals";
import { context } from "@actions/github";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mockCommentData, mockIssueData, sandbox } from "./fixtures.js";
import { parseContext, run } from "../src/main.js";

const inputs = ["TYPE", "NUMBER", "LABEL", "LINK_TO_DOC"];

beforeEach(() => {
  context.payload = {};
  process.env.GITHUB_REPOSITORY = "owner/repo";
  sandbox.removeRoutes();
  sandbox.clearHistory();
});

afterEach(() => {
  for (const input of inputs) {
    delete process.env[`INPUT_${input}`];
  }
  delete process.env.GITHUB_OUTPUT;
});

describe("parseContext", () => {
  test("uses explicit type and number inputs", () => {
    process.env.INPUT_TYPE = "discussion";
    process.env.INPUT_NUMBER = "12";
    expect(parseContext()).toEqual({
      number: 12,
      rollupableType: "discussion",
    });
  });

  test("reads an issue from the payload", () => {
    context.payload = { issue: { number: 3 } };
    expect(parseContext()).toEqual({ number: 3, rollupableType: "issue" });
  });

  test("reads a discussion from the payload", () => {
    context.payload = { discussion: { number: 4 } };
    expect(parseContext()).toEqual({ number: 4, rollupableType: "discussion" });
  });

  test("rejects an unknown type", () => {
    process.env.INPUT_TYPE = "pull_request";
    process.env.INPUT_NUMBER = "1";
    expect(() => parseContext()).toThrow("Unknown rollupable type");
  });

  test("rejects a non-numeric number", () => {
    process.env.INPUT_TYPE = "issue";
    process.env.INPUT_NUMBER = "abc";
    expect(() => parseContext()).toThrow("Invalid number");
  });

  test("throws without a payload or inputs", () => {
    expect(() => parseContext()).toThrow();
  });
});

describe("run", () => {
  const issueUrl = "https://api.github.com/repos/owner/repo/issues/3";

  test("skips issues without the required label", async () => {
    context.payload = { issue: { number: 3 } };
    process.env.INPUT_LABEL = "not-a-real-label";
    sandbox.route({
      method: "GET",
      url: issueUrl,
      response: { status: 200, body: mockIssueData() },
    });

    await run();

    expect(sandbox.callHistory.called(`begin:${issueUrl}/comments`)).toBe(
      false,
    );
    expect(sandbox.callHistory.called(issueUrl, { method: "PATCH" })).toBe(
      false,
    );
  });

  test("updates the body and sets the body output", async () => {
    context.payload = { issue: { number: 3 } };
    const outputFile = join(mkdtempSync(join(tmpdir(), "rollup-")), "output");
    writeFileSync(outputFile, "");
    process.env.GITHUB_OUTPUT = outputFile;

    sandbox.route({
      method: "GET",
      url: issueUrl,
      response: { status: 200, body: mockIssueData({ body: "Original" }) },
    });
    sandbox.route({
      method: "GET",
      url: `begin:${issueUrl}/comments`,
      response: { status: 200, body: [mockCommentData()] },
    });
    sandbox.route({
      method: "PATCH",
      url: issueUrl,
      response: { status: 200, body: { body: "Updated body" } },
    });

    await run();

    expect(sandbox.callHistory.called(issueUrl, { method: "PATCH" })).toBe(
      true,
    );
    const output = readFileSync(outputFile, "utf8");
    expect(output).toContain("body<<");
    expect(output).toContain("Updated body");
  });
});
