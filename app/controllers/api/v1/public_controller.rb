module Api
  module V1
    # Base controller for all public (unauthenticated) endpoints.
    #
    # Concrete public controllers should inherit from here instead of
    # ApplicationController. This tier:
    #   - Requires NO JWT token
    #   - Performs NO Pundit authorization
    #   - Is the right parent for Mesa Virtual, public tracking, etc.
    #
    # Security hooks that apply to all public endpoints live here:
    # rate limiting, origin validation, or IP allowlisting can be
    # added as before_actions without affecting internal controllers.
    class PublicController < ApplicationController
    end
  end
end
