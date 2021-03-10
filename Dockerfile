FROM ruby:2.7

COPY Gemfile ./
RUN bundle install

COPY rollup.rb /rollup.rb

RUN pwd
RUN ls

ENTRYPOINT ["/rollup.rb"]
