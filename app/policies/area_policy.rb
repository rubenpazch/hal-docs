class AreaPolicy < ApplicationPolicy
  def index?   = true           # all authenticated users can browse areas
  def show?    = true
  def create?  = admin_or_manager?
  def update?  = admin_or_manager?
  def destroy? = admin?
  def restore? = admin?
  def members? = true

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
