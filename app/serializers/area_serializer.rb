class AreaSerializer < Blueprinter::Base
  identifier :id

  fields :name, :description, :area_type, :parent_id, :created_at

  field :children_count do |area|
    area.children.kept.count
  end

  field :members_count do |area|
    area.area_memberships.active.count
  end

  view :with_children do
    association :children, blueprint: AreaSerializer
  end

  view :with_members do
    association :area_memberships, blueprint: AreaMembershipSerializer
  end
end
