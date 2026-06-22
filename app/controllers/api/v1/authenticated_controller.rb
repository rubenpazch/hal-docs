module Api
  module V1
    # Base controller for all authenticated (internal staff) endpoints.
    #
    # Concrete internal controllers should inherit from here instead of
    # ApplicationController. This tier enforces:
    #   1. JWT authentication  — current_user must exist (401 otherwise)
    #   2. Pundit authorization — every action must call authorize/skip_authorization
    #      (403 if the after-action hook fires without it being called)
    #
    # Controllers that act exclusively on current_user's own data (Profile,
    # DigitalCertificates) have no Pundit resource to authorize against, so
    # they call `skip_after_action :verify_authorized` in their own class body.
    # That is an explicit, intentional declaration — not a security workaround.
    class AuthenticatedController < ApplicationController
      before_action :authenticate_user!
      after_action  :verify_authorized
    end
  end
end
