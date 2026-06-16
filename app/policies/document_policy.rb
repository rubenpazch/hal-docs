class DocumentPolicy < ApplicationPolicy
  def index?   = true   # all roles can list documents
  def show?    = true
  def create?  = true   # all roles can create
  def search?  = true
  def mine?    = true

  # Only admin/manager can edit or change status of any document;
  # the original creator can also edit their own document
  def update?         = admin_or_manager? || record.created_by_id == user.id
  def update_status?  = admin_or_manager?
  def destroy?        = admin_or_manager?
  def validate_signature? = true

  class Scope < ApplicationPolicy::Scope
    def resolve = scope.all
  end
end
