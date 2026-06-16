class User < ApplicationRecord
  include Discard::Model

  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  has_paper_trail

  # Primary area (for convenience)
  belongs_to :area, optional: true

  # Can belong to multiple areas with different roles
  has_many :area_memberships, dependent: :destroy
  has_many :areas, through: :area_memberships

  # Digital certificates
  has_many :digital_certificates, dependent: :destroy

  # System-level role
  enum :role, { admin: 0, manager: 1, staff: 2 }, default: :staff

  validates :nombre, presence: true
  validates :apellido, presence: true
  validates :dni, presence: true, uniqueness: true, length: { is: 8 }

  def full_name
    "#{nombre} #{apellido}"
  end

  def primary_position
    area_memberships.active.find_by(area: area)&.position_role
  end
end
