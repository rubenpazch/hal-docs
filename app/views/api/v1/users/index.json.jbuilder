json.users @users do |user|
  json.partial! "user", user: user
end

json.meta do
  json.total @users.size
end
