require "rails_helper"

RSpec.describe DocumentFlow, type: :model do
  subject(:flow) { build(:document_flow) }

  # Associations
  it { is_expected.to belong_to(:document) }
  it { is_expected.to belong_to(:from_area).class_name("Area").optional }
  it { is_expected.to belong_to(:to_area).class_name("Area").optional }
  it { is_expected.to belong_to(:performed_by).class_name("User") }

  # Validations
  it { is_expected.to validate_presence_of(:action) }
  it { is_expected.to validate_inclusion_of(:action).in_array(DocumentFlow::ACTIONS) }
  # performed_at is auto-set by before_validation callback, so shoulda-matchers
  # cannot prove the validation by setting it to nil (the callback re-fills it).
  it "auto-sets performed_at before validation when nil" do
    flow.performed_at = nil
    flow.valid?
    expect(flow.performed_at).to be_present
  end
end
