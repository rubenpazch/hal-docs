class DocumentType < ApplicationRecord
  has_many :documents, dependent: :restrict_with_error
  has_many :virtual_submissions, dependent: :restrict_with_error

  validates :name, presence: true
  validates :code, presence: true, uniqueness: true

  scope :active, -> { where(is_active: true) }
end
