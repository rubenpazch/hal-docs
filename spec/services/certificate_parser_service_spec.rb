require "rails_helper"

RSpec.describe CertificateParserService do
  # ------------------------------------------------------------------ helpers

  # Generates an in-memory PKCS#12 (.p12) with a self-signed cert.
  # 1024-bit RSA keeps tests fast; never use this key size in production.
  def generate_p12(password: "test-password")
    key  = OpenSSL::PKey::RSA.generate(1024)
    cert = OpenSSL::X509::Certificate.new
    cert.version    = 2
    cert.serial     = 1
    cert.subject    = OpenSSL::X509::Name.parse("/CN=Juan Perez/O=Test Org/C=PE")
    cert.issuer     = cert.subject
    cert.public_key = key.public_key
    cert.not_before = Time.now - 60
    cert.not_after  = Time.now + 365 * 24 * 60 * 60
    cert.sign(key, OpenSSL::Digest::SHA256.new)
    OpenSSL::PKCS12.create(password, "test-alias", key, cert).to_der
  end

  # ------------------------------------------------------------------ success path

  describe ".call with a valid p12 and correct password" do
    subject(:result) { described_class.call(generate_p12(password: "correct"), "correct") }

    it { is_expected.to be_success }
    it { expect(result.error).to be_nil }

    it "extracts the CN as issued_to" do
      expect(result.metadata[:issued_to]).to eq("Juan Perez")
    end

    it "returns an uppercase hex serial number" do
      expect(result.metadata[:serial_number]).to match(/\A[0-9A-F]+\z/)
    end

    it "includes CN in subject_dn" do
      expect(result.metadata[:subject_dn]).to include("CN=Juan Perez")
    end

    it "returns Time objects for validity dates" do
      expect(result.metadata[:valid_from]).to be_a(Time)
      expect(result.metadata[:valid_until]).to be_a(Time)
    end

    it "has valid_until after valid_from" do
      expect(result.metadata[:valid_until]).to be > result.metadata[:valid_from]
    end
  end

  # ------------------------------------------------------------------ wrong password

  describe ".call with wrong password" do
    subject(:result) { described_class.call(generate_p12(password: "correct"), "wrong") }

    it { is_expected.not_to be_success }
    it { expect(result.metadata).to be_nil }

    it "returns a descriptive error" do
      expect(result.error).to include("Contraseña incorrecta")
    end
  end

  # ------------------------------------------------------------------ invalid file data

  describe ".call with invalid file data" do
    subject(:result) { described_class.call("this is not a p12 file", "any-password") }

    it { is_expected.not_to be_success }
    it { expect(result.metadata).to be_nil }
    it { expect(result.error).not_to be_nil }
  end

  # ------------------------------------------------------------------ empty data

  describe ".call with empty file data" do
    subject(:result) { described_class.call("", "any-password") }

    it { is_expected.not_to be_success }
    it { expect(result.metadata).to be_nil }
    it { expect(result.error).not_to be_nil }
  end

  # ------------------------------------------------------------------ nil password

  describe ".call with nil password (coerced to empty string)" do
    subject(:result) { described_class.call(generate_p12(password: ""), nil) }

    it "does not raise" do
      expect { result }.not_to raise_error
    end

    it "returns a Result object" do
      expect(result).to respond_to(:success?, :error)
    end
  end
end
