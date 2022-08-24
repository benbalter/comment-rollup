# frozen_string_literal: true

RSpec.describe 'CommentRollup' do
  it 'works' do
    ARGV[0] = 1
    ARGV[1] = 'test'
    ENV['GITHUB_REPOSITORY'] = 'test/test'

    issue = { labels: [{ name: 'test' }],
              comments_url: 'https://api.github.com/repos/test/test/issues/1/comments' }.to_json
    issue_stub = stub_request(:get, 'https://api.github.com/repos/test/test/issues/1')
                 .to_return(status: 200, body: issue, headers: { 'Content-Type' => 'application/json' })

    comments = [{ body: 'foo' }, { body: 'bar' }].to_json
    comments_stub = stub_request(:get, 'https://api.github.com/repos/test/test/issues/1/comments')
                    .to_return(status: 200, body: comments, headers: { 'Content-Type' => 'application/json' })

    update = "\n\n<details><summary>Comment rollup</summary>\n\nfoo\n\nbar\n\n</details>"
    update_stub = stub_request(:patch, 'https://api.github.com/repos/test/test/issues/')
                  .with(
                    body: { body: update }.to_json
                  ).to_return(status: 200)

    require_relative '../rollup'

    expect(issue_stub).to have_been_requested
    expect(comments_stub).to have_been_requested
    expect(update_stub).to have_been_requested
  end
end
