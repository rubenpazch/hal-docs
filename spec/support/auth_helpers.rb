module AuthHelpers
  # Generates JWT auth headers for a user without hitting the login endpoint.
  # Returns only the Authorization header; tests control Content-Type via `as: :json`.
  def auth_headers_for(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(
      user,
      :user,
      nil
    )
    {
      "Authorization" => "Bearer #{token}",
      "Accept"        => "application/json"
    }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
