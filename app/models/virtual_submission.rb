class VirtualSubmission < ApplicationRecord
  belongs_to :document_type
  belongs_to :to_area, class_name: "Area", optional: true

  has_many :flows, class_name: "VirtualSubmissionFlow", dependent: :destroy
  has_many_attached :attachments

  SUBMITTER_TYPES = %w[natural juridica].freeze

  enum :status, {
    registrado:  0,
    en_revision: 1,
    observado:   2,
    derivado:    3,
    finalizado:  4
  }, default: :registrado

  validates :tracking_number,    presence: true, uniqueness: true
  validates :submitter_type,     presence: true, inclusion: { in: SUBMITTER_TYPES }
  validates :submitter_name,     presence: true
  validates :submitter_document, presence: true
  validates :submitter_email,    presence: true,
            format: { with: URI::MailTo::EMAIL_REGEXP, message: "no tiene un formato válido" }
  validates :subject,            presence: true
  validates :document_type,      presence: true

  # For juridica type: company_name is required
  validates :company_name,          presence: true, if: -> { submitter_type == "juridica" }
  validates :representative_name,   presence: true, if: -> { submitter_type == "juridica" }

  before_validation :generate_tracking_number, on: :create
  before_create     :set_received_at
  before_create     :assign_default_area

  private

  def generate_tracking_number
    return if tracking_number.present?
    loop do
      num = "VT-#{Time.current.year}-#{SecureRandom.random_number(9_999_999).to_s.rjust(7, '0')}"
      self.tracking_number = num
      break unless VirtualSubmission.exists?(tracking_number: num)
    end
  end

  def set_received_at
    self.received_at ||= Time.current
  end

  def assign_default_area
    self.to_area ||= Area.default_area
  end
end
