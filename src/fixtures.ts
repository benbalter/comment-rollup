import { faker } from "@faker-js/faker";
import { sandbox } from "./octokit.js";
import type { CallLog } from "fetch-mock";

export function mockGraphQL(
  data: Record<string, any>,
  name: string,
  body?: string,
) {
  const matcher = (callLog: CallLog): boolean => {
    if (body == null) {
      return true;
    }

    const reqBody = callLog.options?.body;
    if (reqBody == null) {
      return false;
    }

    return reqBody.toString().includes(body);
  };
  sandbox.route({
    method: "POST",
    url: "https://api.github.com/graphql",
    name,
    matcherFunction: matcher,
    response: {
      status: 200,
      body: data,
    },
  });
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
    body,
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
