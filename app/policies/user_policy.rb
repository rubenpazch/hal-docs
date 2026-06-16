class UserPolicy < ApplicationPolicy
  # Listing users: admin and manager
  def index?   = admin_or_manager?
  def show?    = admin_or_manager? || user == record
  def create?  = admin_or_manager?
  def update?  = admin_or_manager? || user == record
  def destroy? = admin?
  def restore? = admin?

  class Scope < ApplicationPolicy::Scope
    def resolve
      admin? || manager? ? scope.all : scope.where(id: user.id)
    end

    private

    def admin?   = user.admin?
    def manager? = user.manager?
  end
end
