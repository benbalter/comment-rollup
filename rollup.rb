# frozen_string_literal: true

require 'octokit'
require 'dotenv/load'

repo = ENV['GITHUB_REPOSITORY']
issue_number = ARGV[0]
label = ARGV[1] || 'Weekly Update Notes'
summary = 'Comment rollup'
ROLLUP_REGEX = %r{<details>\s*<summary>\s*#{summary}\s*</summary>.*?</details>}i.freeze

client = Octokit::Client.new(access_token: ENV['GITHUB_TOKEN'])
client.auto_paginate = true

issue = client.issue(repo, issue_number)

puts issue.labels.inspect

output = issue.rels[:comments].get.data.map(&:body).join("\n\n")
rollup = "<details><summary>#{summary}</summary>\n\n#{output}\n\n</details>"

body = if ROLLUP_REGEX.match?(issue.body)
         issue.body.gsub(ROLLUP_REGEX, rollup)
       else
         "#{issue.body}\n\n#{rollup}"
       end

client.update_issue(repo, issue.number, body: body)
