class VirtualSubmissionPolicy < ApplicationPolicy
  # All authenticated users can view the admin list and individual submissions
  def index?         = true
  def show?          = true
  def bandeja?       = true
  def update_status? = admin_or_manager?

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
