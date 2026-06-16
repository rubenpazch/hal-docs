class Area < ApplicationRecord
  include Discard::Model
  has_paper_trail

  enum :area_type, { gerencia: 0, departamento: 1, equipo: 2, unidad: 3 }, default: :departamento
  enum :archive_type, { archivo_publico: 0, archivo_regional: 1, archivo_general: 2 }, default: :archivo_publico

  # Self-referential hierarchy
  belongs_to :parent, class_name: "Area", optional: true
  has_many :children, class_name: "Area", foreign_key: :parent_id, dependent: :nullify

  # Members
  has_many :area_memberships, dependent: :destroy
  has_many :users, through: :area_memberships

  # Direct members (users whose primary area is this)
  has_many :primary_users, class_name: "User", foreign_key: :area_id, dependent: :nullify

  validates :name, presence: true, uniqueness: { scope: :parent_id }

  scope :roots, -> { where(parent_id: nil) }
  scope :active, -> { kept }
end
