require "rails_helper"

RSpec.describe VirtualSubmission, type: :model do
  subject(:submission) { build(:virtual_submission) }

  # Associations
  it { is_expected.to belong_to(:document_type) }
  it { is_expected.to belong_to(:to_area).class_name("Area").optional }
  it { is_expected.to have_many(:flows).class_name("VirtualSubmissionFlow").dependent(:destroy) }

  # Validations
  it { is_expected.to validate_presence_of(:submitter_type) }
  it { is_expected.to validate_presence_of(:submitter_name) }
  it { is_expected.to validate_presence_of(:submitter_document) }
  it { is_expected.to validate_presence_of(:submitter_email) }
  it { is_expected.to validate_presence_of(:subject) }
  it { is_expected.to validate_presence_of(:document_type) }
  it "validates uniqueness of tracking_number" do
    saved = create(:virtual_submission)
    duplicate = build(:virtual_submission, tracking_number: saved.tracking_number)
    duplicate.valid?
    expect(duplicate.errors[:tracking_number]).to be_present
  end
  it { is_expected.to validate_inclusion_of(:submitter_type).in_array(VirtualSubmission::SUBMITTER_TYPES) }

  # Enum
  it { is_expected.to define_enum_for(:status).with_values(registrado: 0, en_revision: 1, observado: 2, derivado: 3, finalizado: 4) }

  describe "tracking_number generation" do
    it "auto-generates a tracking_number before create" do
      submission.save!
      expect(submission.tracking_number).to match(/\AVT-\d{4}-\d{7}\z/)
    end

    it "does not overwrite an existing tracking_number" do
      submission.tracking_number = "VT-2026-9999999"
      submission.save!
      expect(submission.tracking_number).to eq("VT-2026-9999999")
    end
  end

  describe "juridica validations" do
    it "requires company_name and representative_name for juridica type" do
      submission.submitter_type = "juridica"
      submission.company_name = nil
      submission.representative_name = nil
      expect(submission).not_to be_valid
      expect(submission.errors[:company_name]).to be_present
      expect(submission.errors[:representative_name]).to be_present
    end
  end

  describe "email format validation" do
    it "rejects invalid email formats" do
      submission.submitter_email = "not-an-email"
      expect(submission).not_to be_valid
    end
  end
end
