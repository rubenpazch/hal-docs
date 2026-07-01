# frozen_string_literal: true

# Security headers middleware
# Applied to every response to harden the API against common browser-based attacks.

Rails.application.config.middleware.insert_before 0, Rack::Builder do
  use(Class.new do
    def initialize(app)
      @app = app
    end

    def call(env)
      status, headers, body = @app.call(env)

      headers.merge!(
        # Prevent MIME-type sniffing — browsers must obey the declared Content-Type
        "X-Content-Type-Options"  => "nosniff",

        # Stop browsers from caching API responses that may contain sensitive data
        "Cache-Control"           => "no-store",

        # Instruct browser not to send the full Referrer to third-party URLs
        "Referrer-Policy"         => "strict-origin-when-cross-origin",

        # Disable browser features not needed by this API
        "Permissions-Policy"      => "geolocation=(), camera=(), microphone=(), payment=()",

        # HSTS: enforce HTTPS for 1 year (production only; nginx handles this, but belt-and-suspenders)
        "Strict-Transport-Security" => "max-age=31536000; includeSubDomains"
      )

      # X-Frame-Options: DENY only on non-blob routes.
      # Active Storage blob/disk responses serve binary files (PDFs, images, etc.)
      # and need to be embeddable in iframes for the document preview feature.
      unless env["PATH_INFO"].start_with?("/rails/active_storage/")
        headers["X-Frame-Options"] = "DENY"
      end

      [ status, headers, body ]
    end
  end)
end
