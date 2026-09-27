import { Octokit, type OctokitOptions } from "@octokit/core";
import { getOctokitOptions } from "@actions/github/lib/utils.js";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { getInput } from "@actions/core";

const OctokitWithPlugins = Octokit.plugin(
  paginateRest,
  paginateGraphQL,
  restEndpointMethods,
);

let instance: InstanceType<typeof OctokitWithPlugins> | undefined;
let fetchOverride: typeof fetch | undefined;

// Lets tests route requests through a mock without bundling it into the action
export function setFetch(fetchImpl: typeof fetch | undefined) {
  fetchOverride = fetchImpl;
}

// Created lazily so a missing token surfaces as an action failure, not an import error
export function getOctokit() {
  if (instance === undefined) {
    const options: OctokitOptions = getOctokitOptions(
      getInput("token", { required: true }),
    );
    const defaultFetch: typeof fetch = options.request?.fetch ?? fetch;
    options.request = {
      ...options.request,
      fetch: async (...args: Parameters<typeof fetch>) =>
        (fetchOverride ?? defaultFetch)(...args),
    };
    instance = new OctokitWithPlugins(options);
  }

  return instance;
}
