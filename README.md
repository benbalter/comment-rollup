# Comment Rollup GitHub Action

This action "rolls up" all comments on an issue or discussion into the issue body under a details tag. It will update the rollup every time a comment is added, edited, or deleted. It can also create a Word document if you'd like.

Why would you ever want to do this? For ease of copying all the comments, either as Markdown or as rich text.

It is based on https://github.com/actions/typescript-action.

## Inputs

* `token` - `${{ secrets.GITHUB_TOKEN }}` **Required**
* `label` - A label to require on issues before rolling up comments (optional)
* `link_to_doc` - Whether to link to a Word document with the rollup (optional). The document is uploaded as a workflow artifact, so the link expires after 7 days.
* `group_by_heading` - Whether to group comments by heading (BETA) (optional)
* `number` - The issue or discussion number to roll up (optional). Defaults to the issue or discussion that triggered the workflow.
* `type` - Whether `number` refers to an `issue` or a `discussion` (optional, defaults to `issue`). Only used when `number` is set.

## Outputs

* `body` - The updated issue or discussion body

If the rollup would push the body past GitHub's 65,536 character limit, the action leaves it out of the body and links to the Word document instead, when there is one.

## Example usage

```yaml
on:
  issue_comment: {} # Remove to only rollup discussion comments
  discussion_comment: {} # Remove to only rollup issue comments

name: Rollup weekly comments

permissions:
  contents: read
  issues: write
  discussions: write

# Keeps overlapping runs from overwriting each other's rollup
concurrency:
  group: rollup-${{ github.event.issue.number || github.event.discussion.number }}
  cancel-in-progress: false

jobs:
  comment_rollup:
    runs-on: ubuntu-latest
    name: Comment rollup

    steps:
      - name: Rollup comments
        uses: benbalter/comment-rollup@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          link_to_doc: true # Optional, remove if you don't want a Word doc.
          label: weekly-rollup # Optional, limits rollups to issues/discussions with the given label
          group_by_heading: true # Optional, groups comments by heading (BETA)
```

