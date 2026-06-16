# Be sure to restart your server when you modify this file.

allowed_origin = ENV.fetch("FRONTEND_URL", "http://localhost:5173")

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins allowed_origin

    # API routes
    resource "/api/*",
      headers:     :any,
      methods:     %i[get post put patch delete options head],
      expose:      ["Authorization"],
      max_age:     86_400,
      credentials: false

    # Devise auth routes
    resource "/api/v1/auth/*",
      headers:     :any,
      methods:     %i[post delete options],
      expose:      ["Authorization"],
      max_age:     86_400,
      credentials: false

    # Health check
    resource "/up",
      headers: :any,
      methods: [:get]
  end
end
