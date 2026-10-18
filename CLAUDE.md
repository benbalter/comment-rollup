# CLAUDE.md

`comment-rollup` is a TypeScript GitHub Action that copies every comment on an issue or discussion into its body under a `<details>` tag, refreshing on each comment event, and can attach the rollup as a Word document uploaded as a workflow artifact. The [README](README.md) covers inputs, outputs, and example usage. Consumers pin the floating major tag (`benbalter/comment-rollup@v2`), not `main`.

## Commands

- `npm ci` (Node 24, ESM via `"type": "module"`). [ci.yml](.github/workflows/ci.yml)'s `build` job runs `npx tsc --noEmit`, `npm run format-check`, `npm run lint-check`, and `npm test` (Jest with `--experimental-vm-modules` and coverage).
- `npm run lint-check` currently passes with 35 warnings and no errors. `npm run lint` and `npm run fix` run `eslint --fix`, so they rewrite files.
- Prettier only covers `**/*.ts`; Markdown and YAML aren't formatted.
- `npm run package` builds `dist/` with `ncc`. It's gitignored, so delete it or leave it; never commit it to `main`.
- [`script/cibuild`](script/cibuild) runs `npm run all` plus `yamllint`, which isn't installed in CI. `npm run run` runs the action locally with `tsx` and a gitignored `.env`; it edits real issues, so point it at a test issue.

## Releasing

`dist/` isn't on `main`. [`script/release vX.Y.Z`](script/release), run from a clean, up-to-date `main`, builds `dist/`, commits it as a detached commit on top of `main`, tags it `vX.Y.Z`, moves `vX` to it, and only prints the `git push` and `gh release create` commands. Pushing those tags ships to every `@v2` user, so it needs the owner's explicit go-ahead. A "Release tags" ruleset stops CI from moving the major tag. That design replaced the old committed-`dist/` setup because Renovate PRs couldn't rebuild the bundle (see [7426bff](https://github.com/benbalter/comment-rollup/commit/7426bffe5a99e7f19df830916c429b2e23963922)).

## Architecture

- [`src/main.ts`](src/main.ts): parses inputs and the event context (`parseContext`), picks `Issue` or `Discussion`, and runs the rollup.
- [`src/rollupable.ts`](src/rollupable.ts): the shared `Rollupable` base class: building the rollup Markdown, `group_by_heading`, the 65,536-character body limit, Word export via `html-to-docx`, and the artifact upload. [`src/issue.ts`](src/issue.ts) and [`src/discussion.ts`](src/discussion.ts) supply REST and GraphQL fetching and updating.
- [`src/octokit.ts`](src/octokit.ts): the Octokit client, with `setFetch` so tests can inject `fetch-mock`.
- Tests in [`__tests__/`](__tests__/) mock the GitHub API through [`fixtures.ts`](__tests__/fixtures.ts), with `faker` seeded for stable data, so they need no token.

## CI that touches live data

- The `test` job in ci.yml builds `dist/` and runs the action against issue #3 in this repo with a write token. It's skipped on fork PRs.
- [integration.yml](.github/workflows/integration.yml) rolls up any issue or discussion here labeled `weekly-rollup` on every comment.
- Both use `npm ci --ignore-scripts` because they hold a write token. Keep it that way.

## Gotchas

- `overrides` maps `xmlbuilder2` to `"$xmlbuilder2"` so it always matches the direct dependency's spec. npm rejects an override that differs from a direct dependency's range, and a hard-coded copy drifts with every bump.
- The `image-size` audit alerts can't be fixed with an override: `html-to-docx@1.8.0` (its latest release) inlines `image-size` into its own `dist`, so overriding the installed copy leaves the `ncc` bundle byte-identical. Leave them until `html-to-docx` ships a fix or gets replaced.
- Renovate uses the shared `benbalter/renovate-config:instant` preset and automerges on green; [`renovate.json`](renovate.json) lists `github-actions[bot]` in `gitIgnoredAuthors`, so Renovate still treats a PR as its own after that bot pushes to it.
