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

  # System-level role — stored as string, validated against system_roles table
  validates :role, presence: true
  validate  :role_must_exist

  def admin?   = role == "admin"
  def manager? = role == "manager"
  def staff?   = role == "staff"
  def has_role?(name) = role == name.to_s

  validates :nombre, presence: true
  validates :apellido, presence: true
  validates :dni, presence: true, uniqueness: true, length: { is: 8 }

  def full_name
    "#{nombre} #{apellido}"
  end

  def primary_position
    area_memberships.active.find_by(area: area)&.position_role
  end

  private

  def role_must_exist
    return if role.blank?
    unless SystemRole.where(name: role).exists?
      errors.add(:role, "no es un rol válido del sistema")
    end
  end
end
