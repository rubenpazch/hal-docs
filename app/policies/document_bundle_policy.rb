class DocumentBundlePolicy < ApplicationPolicy
  def index?   = true
  def show?    = true
  def create?  = true
  def update?  = admin? || record.creator_id == user.id
  def destroy? = admin? || record.creator_id == user.id
  def manage_archivos? = admin? || record.creator_id == user.id
end
