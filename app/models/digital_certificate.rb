class DigitalCertificate < ApplicationRecord
  include Discard::Model
  has_paper_trail

  belongs_to :user
  has_one_attached :certificate_file   # the uploaded .p12 / .pfx file

  validates :alias_name, presence: true
  validates :user_id,    presence: true

  # Ensure only one default per user
  before_save :clear_other_defaults, if: -> { is_default? && is_default_changed? }

  scope :active,  -> { kept }
  scope :expired, -> { kept.where("valid_until < ?", Time.current) }
  scope :valid,   -> { kept.where("valid_until >= ?", Time.current) }

  def expired?
    valid_until.present? && valid_until < Time.current
  end

  def expires_soon?
    valid_until.present? && valid_until.between?(Time.current, 30.days.from_now)
  end

  def status
    return :expired    if expired?
    return :expiring   if expires_soon?
    :valid
  end

  private

  def clear_other_defaults
    user.digital_certificates.kept
        .where.not(id: id)
        .update_all(is_default: false)
  end
end
