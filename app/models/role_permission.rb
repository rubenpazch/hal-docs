class RolePermission < ApplicationRecord
  PAGE_KEYS = %w[
    dashboard
    tramites
    documentos
    pendientes
    archivo
    usuarios
    areas
    tipos_doc
    mis_certificados
    mis_derivados
    mesa_virtual_admin
    accesos
    reportes
    configuracion
  ].freeze

  # Roles are loaded from the DB — call .roles instead of ROLES constant.
  # Kept as a lazy helper so old code referencing ROLES still works at seed/test time.
  ROLES = %w[admin mesa_de_partes].freeze   # fallback for migrations / specs before DB exists

  def self.roles
    SystemRole.pluck(:name)
  rescue ActiveRecord::StatementInvalid
    ROLES  # table doesn't exist yet (early migration)
  end

  # Default visibility per role (used for seeding new roles)
  DEFAULTS = {
    "admin" => PAGE_KEYS.index_with(true),
    "mesa_de_partes" => PAGE_KEYS.index_with(false).merge(
      "dashboard"          => true,
      "tramites"           => true,
      "documentos"         => true,
      "pendientes"         => true,
      "archivo"            => true,
      "mis_certificados"   => true,
      "mis_derivados"      => true,
      "mesa_virtual_admin" => true
    )
  }.freeze

  validates :role,     presence: true
  validates :page_key, presence: true, inclusion: { in: PAGE_KEYS }
  validates :role, uniqueness: { scope: :page_key }
  validate  :role_must_exist

  # Returns a flat hash { page_key => bool } for a given role
  def self.map_for(role)
    where(role: role).pluck(:page_key, :allowed).to_h
  end

  # Ensure all page_keys exist for a role (fills gaps with defaults)
  def self.ensure_defaults!(role)
    existing = where(role: role).pluck(:page_key)
    missing  = PAGE_KEYS - existing
    defaults = DEFAULTS[role] || PAGE_KEYS.index_with(true)
    missing.each do |key|
      create!(role: role, page_key: key, allowed: defaults.fetch(key, true))
    end
  end

  private

  def role_must_exist
    return if role.blank?
    unless SystemRole.where(name: role).exists?
      errors.add(:role, "no es un rol válido del sistema")
    end
  rescue ActiveRecord::StatementInvalid
    nil  # skip during migrations
  end
end

