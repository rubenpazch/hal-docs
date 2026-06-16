class VirtualSubmissionFlow < ApplicationRecord
  belongs_to :virtual_submission
  belongs_to :from_area,    class_name: "Area", optional: true
  belongs_to :to_area,      class_name: "Area", optional: true
  belongs_to :performed_by, class_name: "User", optional: true

  ACTIONS = %w[registrado en_revision observado derivado finalizado].freeze

  validates :action,       presence: true, inclusion: { in: ACTIONS }
  validates :to_status,    presence: true
  validates :performed_at, presence: true

  scope :ordered, -> { order(performed_at: :asc) }

  before_validation :set_performed_at

  private

  def set_performed_at
    self.performed_at ||= Time.current
  end
end
