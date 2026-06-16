class DocumentFlow < ApplicationRecord
  belongs_to :document
  belongs_to :from_area, class_name: "Area", optional: true
  belongs_to :to_area, class_name: "Area", optional: true
  belongs_to :performed_by, class_name: "User"

  ACTIONS = %w[registrado derivado delegado avance devuelto finalizado anulado].freeze

  validates :action, presence: true, inclusion: { in: ACTIONS }
  validates :performed_at, presence: true

  before_validation :set_performed_at

  scope :ordered, -> { order(performed_at: :asc) }

  private

  def set_performed_at
    self.performed_at ||= Time.current
  end
end
