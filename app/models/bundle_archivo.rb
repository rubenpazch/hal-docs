class BundleArchivo < ApplicationRecord
  belongs_to :document_bundle
  belongs_to :archivo

  validates :archivo_id, uniqueness: { scope: :document_bundle_id }
end
