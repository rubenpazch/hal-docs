class SystemRolePolicy < ApplicationPolicy
  def index?   = true            # any authenticated user can see role list
  def create?  = admin?
  def update?  = admin?
  def destroy? = admin?
end
