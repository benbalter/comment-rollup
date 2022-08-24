FROM ruby:3.1.2

COPY Gemfile ./
RUN bundle install

COPY rollup.rb /rollup.rb

ENTRYPOINT ["/rollup.rb"]
