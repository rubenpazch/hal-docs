class AreaMembershipSerializer < Blueprinter::Base
  identifier :id

  fields :position_role, :is_active, :created_at

  association :user, blueprint: UserSerializer
  association :area, blueprint: AreaSerializer
end
