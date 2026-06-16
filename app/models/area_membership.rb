class AreaMembership < ApplicationRecord
  belongs_to :user
  belongs_to :area

  enum :position_role, {
    jefe: 0,
    coordinador: 1,
    operador_linea: 2,
    soporte: 3
  }, default: :soporte

  validates :user_id, uniqueness: { scope: :area_id, message: "ya es miembro de esta área" }

  scope :active, -> { where(is_active: true) }
end
