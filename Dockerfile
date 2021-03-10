FROM ruby:2.7

COPY Gemfile ./
RUN bundle install

COPY entrypoint.sh rollup.rb ./

ENTRYPOINT ["bundle", "exec", "ruby", "rollup.rb"]
