class Archivo < ApplicationRecord
  belongs_to :uploader,      class_name: "User"
  belongs_to :document_type

  has_one_attached :file

  has_many :document_archivos, dependent: :destroy
  has_many :documents, through: :document_archivos
  has_many :bundle_archivos, dependent: :destroy
  has_many :document_bundles, through: :bundle_archivos

  enum :estado, { borrador: 0, firmado: 1 }, default: :borrador

  validates :nombre,        presence: true
  validates :document_type, presence: true
  validate  :file_must_be_attached

  def firmado? = estado == "firmado"
  def tramites_count = documents.count

  def file_url
    return nil unless file.attached?
    Rails.application.routes.url_helpers.rails_blob_url(file, only_path: true)
  end

  private

  def file_must_be_attached
    errors.add(:file, "debe adjuntar un archivo") unless file.attached?
  end
end
