class RolePermission < ApplicationRecord
  ROLES = %w[admin manager staff].freeze

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

  # Default visibility per role (used for seeding and reset)
  DEFAULTS = {
    "admin" => PAGE_KEYS.index_with(true),
    "manager" => PAGE_KEYS.index_with(true).merge(
      "tipos_doc"     => false,
      "configuracion" => false
    ),
    "staff" => PAGE_KEYS.index_with(false).merge(
      "dashboard"         => true,
      "tramites"          => true,
      "documentos"        => true,
      "pendientes"        => true,
      "archivo"           => true,
      "mis_certificados"  => true,
      "mis_derivados"     => true,
      "mesa_virtual_admin" => true
    )
  }.freeze

  validates :role,     presence: true, inclusion: { in: ROLES }
  validates :page_key, presence: true, inclusion: { in: PAGE_KEYS }
  validates :role, uniqueness: { scope: :page_key }

  # Returns a flat hash { page_key => bool } for a given role
  def self.map_for(role)
    where(role: role).pluck(:page_key, :allowed).to_h
  end

  # Ensure all page_keys exist for a role (fills gaps with defaults)
  def self.ensure_defaults!(role)
    existing = where(role: role).pluck(:page_key)
    missing = PAGE_KEYS - existing
    defaults = DEFAULTS[role] || {}
    missing.each do |key|
      create!(role: role, page_key: key, allowed: defaults.fetch(key, true))
    end
  end
end
