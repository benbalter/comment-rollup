FROM ruby:2.7

COPY Gemfile ./
RUN bundle install

COPY rollup.rb ./

ENTRYPOINT ["./rollup.rb"]
