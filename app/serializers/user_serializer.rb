class UserSerializer < Blueprinter::Base
  identifier :id

  fields :email, :nombre, :apellido, :telefono, :role, :dni, :created_at, :discarded_at

  field :full_name do |user|
    user.full_name
  end

  field :is_active do |user|
    user.discarded_at.nil?
  end

  field :area_id do |user|
    user.area_id
  end

  field :area_name do |user|
    user.area&.name
  end

  field :cargo do |user|
    user.primary_position
  end

  view :with_memberships do
    association :area_memberships, blueprint: AreaMembershipSerializer
  end
end
