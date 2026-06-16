# frozen_string_literal: true

# Rack::Attack — rate limiting and request throttling
# https://github.com/rack/rack-attack

# Disable in test environment to avoid interfering with request specs
Rack::Attack.enabled = !Rails.env.test?

class Rack::Attack
  # ── Cache store ─────────────────────────────────────────────────────────────
  # Uses Rails cache (memory_store by default; swap for Redis in production).
  Rack::Attack.cache.store = Rails.cache

  # ── Throttles ────────────────────────────────────────────────────────────────

  # Login endpoint: 10 attempts per IP per minute
  throttle("logins/ip", limit: 10, period: 1.minute) do |req|
    req.ip if req.path == "/api/v1/auth/login" && req.post?
  end

  # Login endpoint: 5 attempts per email per minute (credential stuffing protection)
  throttle("logins/email", limit: 5, period: 1.minute) do |req|
    if req.path == "/api/v1/auth/login" && req.post?
      # Parse body to extract email — limit to 1 KB to avoid DoS
      body = req.body.read(1024)
      req.body.rewind

      begin
        data = JSON.parse(body)
        data.dig("user", "email")&.downcase&.strip
      rescue JSON::ParseError
        nil
      end
    end
  end

  # Mesa virtual public submit: 20 per IP per minute
  throttle("mesa_virtual/ip", limit: 20, period: 1.minute) do |req|
    req.ip if req.path.start_with?("/api/v1/mesa_virtual")
  end

  # General API: 300 requests per IP per 5 minutes
  throttle("api/ip", limit: 300, period: 5.minutes) do |req|
    req.ip if req.path.start_with?("/api/")
  end

  # ── Block suspicious clients ──────────────────────────────────────────────────

  # Block clients with empty User-Agent (common in scripted attacks)
  # Disabled in test environment since request specs don't set User-Agent by default
  unless Rails.env.test?
    blocklist("block/no-user-agent") do |req|
      req.path.start_with?("/api/") &&
        req.user_agent.blank? &&
        req.path != "/up"
    end
  end

  # ── Throttle response ─────────────────────────────────────────────────────────

  # Return 429 Too Many Requests with a JSON body (not HTML)
  self.throttled_responder = lambda do |env|
    match_data = env["rack.attack.match_data"]
    now        = match_data[:epoch_time]
    retry_at   = now + match_data[:period] - (now % match_data[:period])

    headers = {
      "Content-Type"  => "application/json",
      "Retry-After"   => (retry_at - now).to_s,
      "X-RateLimit-Limit"     => match_data[:limit].to_s,
      "X-RateLimit-Remaining" => "0",
      "X-RateLimit-Reset"     => retry_at.to_s
    }

    [ 429, headers, [ { error: "Demasiadas solicitudes. Intente nuevamente más tarde." }.to_json ] ]
  end

  # Return 403 Forbidden with a JSON body for blocked requests
  self.blocklisted_responder = lambda do |_env|
    [ 403, { "Content-Type" => "application/json" }, [ { error: "Acceso denegado." }.to_json ] ]
  end
end

# Mount the middleware
Rails.application.config.middleware.use Rack::Attack
