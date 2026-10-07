# CLAUDE.md

GitHub Action that rolls up an issue's or discussion's comments into one comment (and optionally a `.docx`). TypeScript in [`src/`](src/), tests in [`__tests__/`](__tests__/), bundled to [`dist/`](dist/) with ncc.

## Commands

- CI runs `npx tsc --noEmit`, `npm run format-check`, `npm run lint-check`, and `npm test`; [`check-dist.yml`](.github/workflows/check-dist.yml) then runs `npm run package` and fails if `dist/` changed. Run those before committing.
- `npm run all` formats, lints with `--fix`, packages, and tests, so it rewrites files.

## Generated files

- `dist/` is the bundle the Action runs. Rebuild with `npm run package` and commit it with any change to `src/` or dependencies. For Renovate and Dependabot PRs, [`rebuild-dist.yml`](.github/workflows/rebuild-dist.yml) commits it for you.

## Releasing

Users pin the major tag (`benbalter/comment-rollup@v2`), so moving that tag or publishing a release ships to every workflow that uses it. Prepare a release PR if asked, but tag or publish only after the owner's explicit go-ahead, and push branches with `--no-follow-tags`.

## Gotchas

- The `test` job in [`ci.yml`](.github/workflows/ci.yml) runs the action for real against issue #3 in this repo on every push and same-repo PR.
