json.member do
  json.extract! @membership, :id, :position_role, :is_active, :created_at
  json.user do
    json.extract! @membership.user, :id, :nombre, :apellido, :email
    json.full_name @membership.user.full_name
  end
  json.area do
    json.extract! @membership.area, :id, :name
  end
end
