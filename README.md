# Comment Rollup GitHub Action

This action "rolls up" all comments on an issue or discussion into the issue body under a details tag. It will update the rollup every time a comment is added, edited, or deleted. It can also create a Word document if you'd like.

Why would you ever want to do this? For ease of copying all the comments, either as Markdown or as rich text.

It is based on https://github.com/actions/typescript-action.

## Inputs

* `token` - `${{ secrets.GITHUB_TOKEN }}` **Required**
* `label` - A label to require on issues before rolling up comments (optional)
* `link_to_doc` - Whether to link to a Word document with the rollup (optional)
* `group_by_headings` - Whether to group comments by heading (BETA) (optional)

## Example usage

```yaml
on: 
  issue_comment: {} # Remove to only rollup discussion comments
  discussion_comment: {} # Remove to only rollup issue comments

name: Rollup weekly comments

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

