import fetchMock from "fetch-mock";
import { type Octokit } from "octokit";
import { GitHub, getOctokitOptions } from "@actions/github/lib/utils";
import { paginateGraphql } from "@octokit/plugin-paginate-graphql";
import { faker } from "@faker-js/faker";

export const sandbox = fetchMock.sandbox();
const OctokitWithPaginate = GitHub.plugin(paginateGraphql);
const token = "TEST_TOKEN";
const octokitOptions = getOctokitOptions(token);
octokitOptions.request = { fetch: sandbox };
export const octokit = new OctokitWithPaginate(octokitOptions) as Octokit;

export function mockGraphQL(
  data: Record<string, any>,
  name: string,
  body?: string,
) {
  const response = { status: 200, body: data };
  const matcher = (_: string, options: Record<string, any>): boolean => {
    if (body == null) {
      return true;
    }

    if (options.body == null) {
      return false;
    }

    return options.body.toString().includes(body);
  };
  sandbox.mock(
    {
      method: "POST",
      url: "https://api.github.com/graphql",
      name,
      functionMatcher: matcher,
    },
    response,
    { sendAsJson: true },
  );
}

export function mockLabels() {
  return faker.word
    .words()
    .split(" ")
    .map((word: string) => {
      return {
        name: word,
      };
    });
}
export function mockDiscussionData(overrides?: Record<string, any>) {
  const repo = faker.company.buzzNoun();
  const owner = faker.company.buzzNoun();
  const title = `${faker.internet.emoji()} ${faker.company.buzzPhrase()}`;
  const defaults = {
    number: faker.number.int(),
    id: faker.string.alphanumeric(),
    title,
    repo: {
      name: repo,
    },
    owner: {
      login: owner,
    },
    body: faker.lorem.paragraphs(),
    labels: {
      nodes: mockLabels(),
    },
  };
  if (overrides === undefined) {
    return defaults;
  }
  return { ...defaults, ...overrides };
}

export function mockCommentData(overrides?: Record<string, any>) {
  const login = faker.internet.userName();
  const body = `
    ## Heading 1

    * ${faker.lorem.sentence()}
    * ${faker.lorem.sentence()}
    * ${faker.lorem.sentence()}
    
    ## Heading 2

    * ${faker.lorem.sentence()}
    * ${faker.lorem.sentence()}
    * ${faker.lorem.sentence()}
`;
  const defaults = {
    body: body,
    author: {
      login,
    },
    user: {
      login,
    },
  };
  if (overrides === undefined) {
    return defaults;
  }
  return { ...defaults, ...overrides };
}

export function mockIssueData(overrides?: Record<string, any>) {
  const data = {
    labels: mockLabels(),
    title: faker.company.buzzPhrase(),
    body: faker.lorem.paragraphs(),
  };

  if (overrides === undefined) {
    return data;
  }
  return { ...data, ...overrides };
}
