json.extract! user, :id, :email, :nombre, :apellido, :dni, :telefono,
                     :role, :area_id, :created_at, :discarded_at

json.full_name user.full_name
json.is_active user.discarded_at.nil?

# Use loaded association to avoid N+1
json.area_name user.area&.name

# Compute cargo from loaded area_memberships to avoid extra query
if user.association(:area_memberships).loaded?
  active_membership = user.area_memberships
                          .select { |m| m.is_active && m.area_id == user.area_id }
                          .first
  json.cargo active_membership&.position_role
else
  json.cargo user.primary_position
end

if local_assigns[:include_memberships] && user.association(:area_memberships).loaded?
  json.area_memberships user.area_memberships do |membership|
    json.extract! membership, :id, :position_role, :is_active, :created_at
    if membership.association(:area).loaded?
      json.area do
        json.extract! membership.area, :id, :name
      end
    end
  end
end
