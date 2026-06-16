json.user do
  json.partial! "api/v1/users/user", user: @current_user_profile, include_memberships: true
end
