class Document < ApplicationRecord
  has_paper_trail only: [ :status, :area_id, :direction, :access_level ]

  belongs_to :document_type
  belongs_to :area, optional: true
  belongs_to :created_by, class_name: "User", foreign_key: :created_by_id

  has_many :document_flows, dependent: :destroy

  # Active Storage attachments
  has_many_attached :attachments

  enum :priority, {
    baja: 0,
    media: 1,
    alta: 2,
    urgente: 3
  }, default: :media

  enum :status, {
    registrado: 0,
    en_proceso: 1,
    derivado: 2,
    respondido: 3,
    archivado: 4,
    anulado: 5,
    devuelto: 6,
    finalizado: 7
  }, default: :registrado

  enum :direction, {
    entrada: 0,
    interno: 1,
    salida: 2
  }, default: :entrada

  enum :access_level, {
    publico: 0,
    interno_area: 1,
    reservado: 2,
    confidencial: 3
  }, default: :publico

  validates :subject, presence: true
  validates :sender, presence: true
  validates :recipient, presence: true
  validates :document_type, presence: true

  before_create :assign_document_number
  before_create :set_received_at
  after_commit  :compute_attachment_checksum, on: [ :create, :update ], if: :attachments_changed?

  private

  def assign_document_number
    return if document_number.present?
    prefix = document_type.code
    year   = Time.current.year
    count  = Document.where("document_number LIKE ?", "#{prefix}-#{year}-%").count + 1
    self.document_number = "#{prefix}-#{year}-#{count.to_s.rjust(5, '0')}"
  end

  def set_received_at
    self.received_at ||= Time.current
    hour = received_at.in_time_zone("Lima").hour
    minute = received_at.in_time_zone("Lima").min
    in_minutes = hour * 60 + minute
    self.outside_hours = !(in_minutes >= 510 && in_minutes < 1050) # 08:30–17:30
  end

  def attachments_changed?
    attachments.any?
  end

  def compute_attachment_checksum
    return unless attachments.attached?
    checksum = Digest::SHA256.hexdigest(attachments.first.download)
    update_column(:attachment_checksum, checksum)
  rescue StandardError
    nil
  end
end
