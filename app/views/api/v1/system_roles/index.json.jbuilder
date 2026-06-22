json.array! @roles do |role|
  json.partial! "api/v1/system_roles/role", role: role
end
