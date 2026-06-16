require "rails_helper"

RSpec.describe DocumentType, type: :model do
  subject(:document_type) { build(:document_type) }

  # Associations
  it { is_expected.to have_many(:documents).dependent(:restrict_with_error) }
  it { is_expected.to have_many(:virtual_submissions).dependent(:restrict_with_error) }

  # Validations
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_presence_of(:code) }
  it { is_expected.to validate_uniqueness_of(:code) }

  describe ".active scope" do
    it "returns only active types" do
      active   = create(:document_type, is_active: true)
      inactive = create(:document_type, is_active: false)

      expect(DocumentType.active).to include(active)
      expect(DocumentType.active).not_to include(inactive)
    end
  end
end
