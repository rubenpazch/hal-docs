json.permissions @permissions
json.page_keys   RolePermission::PAGE_KEYS

json.roles @roles_meta do |role|
  json.name         role.name
  json.display_name role.display_name
  json.color        role.color
  json.bg_color     role.bg_color
  json.is_system    role.is_system
  json.deletable    role.deletable?
end
