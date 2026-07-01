class ArchivoPolicy < ApplicationPolicy
  # Any authenticated user can browse the shared repository
  def index?  = true
  def show?   = true

  # Any authenticated user can upload
  def create? = true

  # Only the uploader (or admin) can delete; cannot delete if linked to tramites
  def destroy?
    admin? || record.uploader_id == user.id
  end

  # Only the uploader can sign their own archivo
  def sign?
    record.uploader_id == user.id
  end
end
