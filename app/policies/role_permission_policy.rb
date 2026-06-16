class RolePermissionPolicy < ApplicationPolicy
  def index?   = admin_or_manager?
  def update?  = admin_or_manager?
end
