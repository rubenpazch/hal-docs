json.extract! area, :id, :name, :description, :area_type, :parent_id, :created_at

# Use loaded children and filter in memory to avoid N+1 from .kept scope
if area.association(:children).loaded?
  json.children_count area.children.count { |c| c.discarded_at.nil? }
else
  json.children_count area.children.kept.count
end

# Use loaded area_memberships and filter in memory
if area.association(:area_memberships).loaded?
  json.members_count area.area_memberships.count(&:is_active)
else
  json.members_count area.area_memberships.active.count
end

if local_assigns[:include_children] && area.association(:children).loaded?
  json.children area.children.select { |c| c.discarded_at.nil? } do |child|
    json.extract! child, :id, :name, :area_type, :parent_id
  end
end

if local_assigns[:include_memberships] && area.association(:area_memberships).loaded?
  json.area_memberships area.area_memberships do |membership|
    json.extract! membership, :id, :position_role, :is_active
    if membership.association(:user).loaded?
      json.user do
        json.extract! membership.user, :id, :nombre, :apellido, :email
        json.full_name membership.user.full_name
      end
    end
  end
end
