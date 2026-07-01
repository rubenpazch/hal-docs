class DocumentArchivo < ApplicationRecord
  belongs_to :document
  belongs_to :archivo

  validates :archivo_id, uniqueness: { scope: :document_id }
end
