json.user do
  json.partial! "user", user: @user, include_memberships: true
end
