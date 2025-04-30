import { faker } from "@faker-js/faker";
import { sandbox } from "./octokit.js";
export function mockGraphQL(data, name, body) {
    const response = { status: 200, body: data };
    const matcher = (_, options) => {
        if (body == null) {
            return true;
        }
        if (options.body == null) {
            return false;
        }
        return options.body.toString().includes(body);
    };
    sandbox.mock({
        method: "POST",
        url: "https://api.github.com/graphql",
        name,
        functionMatcher: matcher,
    }, response, { sendAsJson: true });
}
export function mockLabels() {
    return faker.word
        .words()
        .split(" ")
        .map((word) => {
        return {
            name: word,
        };
    });
}
export function mockDiscussionData(overrides) {
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
    return Object.assign(Object.assign({}, defaults), overrides);
}
export function mockCommentData(overrides) {
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
    return Object.assign(Object.assign({}, defaults), overrides);
}
export function mockIssueData(overrides) {
    const data = {
        labels: mockLabels(),
        title: faker.company.buzzPhrase(),
        body: faker.lorem.paragraphs(),
    };
    if (overrides === undefined) {
        return data;
    }
    return Object.assign(Object.assign({}, data), overrides);
}
