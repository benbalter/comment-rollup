import { Octokit } from "@octokit/core";
import { getOctokitOptions } from "@actions/github/lib/utils.js";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { getInput } from "@actions/core";
import fetchMock from "fetch-mock";
export const sandbox = fetchMock.sandbox();
const OctokitWithPlugins = Octokit.plugin(paginateRest, paginateGraphQL, restEndpointMethods);
let options = {};
if (process.env.NODE_ENV === "test") {
    options = getOctokitOptions("TEST_TOKEN");
    options.request = { fetch: sandbox };
}
else {
    options = getOctokitOptions(getInput("GITHUB_TOKEN", { required: true }));
}
export const octokit = new OctokitWithPlugins(options);
