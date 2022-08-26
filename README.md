# Comment Rollup GitHub Action

This action "rolls up" all comments on an issue into the issue body under a details tag. It will update the rollup every time a comment is added, edited, or deleted. 

Why would you ever want to do this? For ease of copying all the comments, either as Markdown or as rich text.

It is based on https://github.com/actions/typescript-action.
## Inputs

`token` - `${{ secrets.GITHUB_TOKEN }}`
`issue_number` - the issue number to roll up
`label` - A label to require on issues before rolling up comments (optional)

## Example usage

```yaml
on: issue_comment

name: Rollup weekly comments

jobs:
  comment_rollup:
    runs-on: ubuntu-latest
    name: Comment rollup
    steps:
    - name: Rollup comments
      uses: benbalter/comment-rollup@v1
      with:
        label: 'Weekly Update Notes'
        issue_number: ${{ github.event.issue.number }} # Needed to know what issue was updated
        token: ${{ secrets.GITHUB_TOKEN }}
```

