import { expect, test } from "@jest/globals";
import { mockCommentData } from "./fixtures.js";
import { Issue } from "../src/issue.js";
import { MAX_BODY_LENGTH, type Comment } from "../src/rollupable.js";

const start = "<!-- comment-rollup:start -->";
const end = "<!-- comment-rollup:end -->";

function buildIssue(body: string, comments: Comment[] = [mockCommentData()]) {
  const issue = new Issue("owner/repo", 1);
  issue._data = { body, title: "Title", labels: [], comments: [] };
  issue.comments = comments;
  return issue;
}

function countOccurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

afterEach(() => {
  delete process.env.INPUT_GROUP_BY_HEADING;
  delete process.env.INPUT_GROUP_BY_HEADINGS;
});

describe("bodyWithRollup", () => {
  test("appends a marked rollup to the body", () => {
    const body = buildIssue("Original body").bodyWithRollup();
    expect(body.startsWith("Original body\n\n")).toBe(true);
    expect(body).toContain(start);
    expect(body).toContain("<summary>Comment rollup</summary>");
    expect(body.trimEnd().endsWith(end)).toBe(true);
  });

  test("does not prepend a literal null when the body is empty", () => {
    const body = buildIssue("").bodyWithRollup();
    expect(body.startsWith(start)).toBe(true);
    expect(body).not.toContain("null");
  });

  test("replaces an existing rollup instead of duplicating it", () => {
    const comments = [mockCommentData()];
    const first = buildIssue("Original body", comments).bodyWithRollup();
    const second = buildIssue(first, comments).bodyWithRollup();
    expect(second).toEqual(first);
    expect(countOccurrences(second, start)).toBe(1);
  });

  test("survives comments that contain their own details blocks", () => {
    const comments = [
      {
        body: "<details><summary>Nested</summary>\n\nhidden\n\n</details>\n\nafter",
        user: { login: "someone" },
      },
    ];
    const first = buildIssue("Original body", comments).bodyWithRollup();
    const second = buildIssue(first, comments).bodyWithRollup();
    expect(second).toEqual(first);
    expect(countOccurrences(second, "after")).toBe(1);
  });

  test("migrates a rollup written before markers existed", () => {
    const legacy =
      "Original body\n\n<details><summary>Comment rollup</summary>\n\nFrom: old\n\n<details><summary>Nested</summary>x</details>\n\n</details>";
    const body = buildIssue(legacy).bodyWithRollup();
    expect(body).not.toContain("From: old");
    expect(countOccurrences(body, "<summary>Comment rollup</summary>")).toBe(1);
    expect(body).toContain(start);
  });

  test("treats dollar signs in comments literally", () => {
    const comments = [{ body: "costs $& and $'", user: { login: "someone" } }];
    const existing = buildIssue("Original body", comments).bodyWithRollup();
    const body = buildIssue(existing, comments).bodyWithRollup();
    expect(body).toContain("costs $& and $'");
  });

  test("omits the inline rollup when it would exceed the body limit", () => {
    const comments = [
      { body: "x".repeat(MAX_BODY_LENGTH), user: { login: "someone" } },
    ];
    const body = buildIssue("Original body", comments).bodyWithRollup(
      "https://example.com/rollup",
    );
    expect(body.length).toBeLessThan(MAX_BODY_LENGTH);
    expect(body).toContain("too large");
    expect(body).toContain("[Download rollup](https://example.com/rollup)");
  });
});

describe("rollup", () => {
  test("includes the download link", () => {
    const rollup = buildIssue("").rollup("https://example.com/rollup");
    expect(rollup).toMatch(
      /^\[Download rollup\]\(https:\/\/example.com\/rollup\)/,
    );
  });

  test("keeps the download link when grouping by heading", () => {
    process.env.INPUT_GROUP_BY_HEADING = "true";
    const rollup = buildIssue("").rollup("https://example.com/rollup");
    expect(rollup).toMatch(/^\[Download rollup\]/);
    expect(rollup).toContain("## Heading 1");
  });

  test("accepts the deprecated group_by_headings input", () => {
    process.env.INPUT_GROUP_BY_HEADINGS = "true";
    const rollup = buildIssue("").rollup();
    expect(rollup).not.toContain("From:");
  });
});

describe("commentsByHeadings", () => {
  test("groups content under shared headings", () => {
    const comments = [
      { body: "## Wins\n\n* a\n\n## Risks\n\n* b", user: { login: "one" } },
      { body: "## Wins\n\n* c\n\n## Risks\n\n* d", user: { login: "two" } },
    ];
    const output = buildIssue("", comments).commentsByHeadings();
    expect(output).toEqual(
      "## Wins\n\n* a\n\n* c\n\n## Risks\n\n* b\n\n* d\n\n",
    );
  });
});
