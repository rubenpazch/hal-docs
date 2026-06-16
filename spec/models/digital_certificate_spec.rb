require "rails_helper"

RSpec.describe DigitalCertificate, type: :model do
  subject(:cert) { build(:digital_certificate) }

  # Associations
  it { is_expected.to belong_to(:user) }

  # Validations
  it { is_expected.to validate_presence_of(:alias_name) }
  it { is_expected.to validate_presence_of(:user_id) }

  describe "#expired?" do
    it "returns true when valid_until is in the past" do
      cert.valid_until = 1.day.ago
      expect(cert.expired?).to be true
    end

    it "returns false when valid_until is in the future" do
      cert.valid_until = 1.year.from_now
      expect(cert.expired?).to be false
    end

    it "returns false when valid_until is nil" do
      cert.valid_until = nil
      expect(cert.expired?).to be false
    end
  end

  describe "#expires_soon?" do
    it "returns true when certificate expires within 30 days" do
      cert.valid_until = 15.days.from_now
      expect(cert.expires_soon?).to be true
    end

    it "returns false when certificate expires in more than 30 days" do
      cert.valid_until = 60.days.from_now
      expect(cert.expires_soon?).to be false
    end
  end

  describe "#status" do
    it "returns :expired when expired" do
      cert.valid_until = 1.day.ago
      expect(cert.status).to eq(:expired)
    end

    it "returns :expiring when expires soon" do
      cert.valid_until = 10.days.from_now
      expect(cert.status).to eq(:expiring)
    end

    it "returns :valid otherwise" do
      cert.valid_until = 1.year.from_now
      expect(cert.status).to eq(:valid)
    end
  end

  describe "soft delete" do
    let!(:persisted_cert) { create(:digital_certificate) }

    it "is in kept scope when active" do
      expect(DigitalCertificate.kept).to include(persisted_cert)
    end

    it "is excluded from kept scope after discard" do
      persisted_cert.discard
      expect(DigitalCertificate.kept).not_to include(persisted_cert)
    end
  end
end
