class DocumentFlowSerializer < Blueprinter::Base
  identifier :id

  fields :action, :from_status, :to_status, :observations, :performed_at, :created_at

  association :performed_by, blueprint: UserSerializer
  association :from_area, blueprint: AreaSerializer
  association :to_area, blueprint: AreaSerializer
end
