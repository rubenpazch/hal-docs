class DocumentBundle < ApplicationRecord
  belongs_to :creator, class_name: "User"
  has_many :bundle_archivos, dependent: :destroy
  has_many :archivos, through: :bundle_archivos

  validates :name, presence: true
end
