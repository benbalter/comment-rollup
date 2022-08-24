# frozen_string_literal: true

require 'webmock/rspec'
WebMock.disable_net_connect!

RSpec.configure do |config|
  config.filter_run_when_matching :focus
  config.disable_monkey_patching!
  config.warnings = true

  config.default_formatter = 'doc' if config.files_to_run.one?

  config.order = :random
  Kernel.srand config.seed
end
