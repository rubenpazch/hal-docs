class SystemRole < ApplicationRecord
  # admin: global administrator, no functional area within the org.
  # mesa_de_partes: static system role — all external document intake is
  # automatically assigned here. Tied to the default Mesa de Partes area.
  SYSTEM_NAMES = %w[admin mesa_de_partes].freeze

  validates :name,         presence: true,
                           uniqueness: { case_sensitive: false },
                           format: { with: /\A[a-z][a-z0-9_]*\z/,
                                     message: "solo letras minúsculas, números y guión bajo" }
  validates :display_name, presence: true
  validates :color,        presence: true,
                           format: { with: /\A#[0-9a-fA-F]{6}\z/, message: "debe ser un color hex (ej. #5b21b6)" }
  validates :bg_color,     presence: true,
                           format: { with: /\A#[0-9a-fA-F]{6}\z/, message: "debe ser un color hex (ej. #ede9fe)" }

  before_destroy :prevent_system_delete
  before_update  :prevent_system_rename

  def system? = is_system?
  def deletable? = !system? && User.where(role: name).none?

  private

  def prevent_system_delete
    if system?
      errors.add(:base, "El rol '#{name}' es un rol del sistema y no puede eliminarse")
      throw :abort
    end
    if User.where(role: name).exists?
      errors.add(:base, "No se puede eliminar el rol '#{name}': hay usuarios asignados")
      throw :abort
    end
  end

  def prevent_system_rename
    return unless system? && name_changed?
    errors.add(:name, "no se puede cambiar el nombre de un rol del sistema")
    throw :abort
  end
end
