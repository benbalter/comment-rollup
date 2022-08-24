FROM ruby:3.0

COPY Gemfile ./
RUN bundle install

COPY rollup.rb /rollup.rb

ENTRYPOINT ["/rollup.rb"]
