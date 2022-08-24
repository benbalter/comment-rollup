#!/usr/bin/env ruby
# frozen_string_literal: true

require 'octokit'
require 'dotenv/load'

repo = ENV.fetch('GITHUB_REPOSITORY', nil)
issue_number = ARGV[0]
label = ARGV[1].strip || 'Weekly Update Notes'
summary = 'Comment rollup'
ROLLUP_REGEX = %r{<details>\s*<summary>\s*#{summary}\s*</summary>.*?</details>}im

client = Octokit::Client.new(access_token: ENV.fetch('GITHUB_TOKEN', nil))
client.auto_paginate = true

issue = client.issue(repo, issue_number)
labels = issue.labels.map(&:name)

unless labels.include?(label)
  puts "Issue `#{issue.title}` does not have label `#{label}`. Skipping."
  exit
end

comments = issue.rels[:comments].get.data
output = comments.map(&:body).join("\n\n")
rollup = "<details><summary>#{summary}</summary>\n\n#{output}\n\n</details>"

body = if ROLLUP_REGEX.match?(issue.body)
         issue.body.gsub(ROLLUP_REGEX, rollup)
       else
         "#{issue.body}\n\n#{rollup}"
       end

client.update_issue(repo, issue.number, body: body)

puts "Rolled up #{comments.count} comments."
