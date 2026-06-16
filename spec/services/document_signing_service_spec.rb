require "rails_helper"

RSpec.describe DocumentSigningService do
  # ------------------------------------------------------------------ helpers

  # Generates an in-memory PKCS#12 with a self-signed cert.
  # 1024-bit RSA keeps tests fast; do not use in production.
  def generate_p12(password: "test-password")
    key  = OpenSSL::PKey::RSA.generate(1024)
    cert = OpenSSL::X509::Certificate.new
    cert.version    = 2
    cert.serial     = 1
    cert.subject    = OpenSSL::X509::Name.parse("/CN=Test Signer/O=Test/C=PE")
    cert.issuer     = cert.subject
    cert.public_key = key.public_key
    cert.not_before = Time.now - 60
    cert.not_after  = Time.now + 365 * 24 * 60 * 60
    cert.sign(key, OpenSSL::Digest::SHA256.new)
    OpenSSL::PKCS12.create(password, "signer-alias", key, cert).to_der
  end

  let(:file_content) { "This is a sample document to sign." }
  let(:p12_data)     { generate_p12(password: "secret") }

  # ------------------------------------------------------------------ success paths

  describe ".call with valid inputs" do
    subject(:result) do
      described_class.call(file_data: file_content, p12_data: p12_data, password: "secret")
    end

    it { is_expected.to be_success }
    it { expect(result.error).to be_nil }
    it { expect(result.signed_data).not_to be_nil }
    it { expect(result.signed_data.bytesize).to be > 0 }

    it "produces a parseable DER-encoded PKCS#7 structure" do
      pkcs7 = OpenSSL::PKCS7.new(result.signed_data)
      expect(pkcs7).to be_a(OpenSSL::PKCS7)
    end
  end

  describe ".call produces a detached CAdES signature" do
    subject(:pkcs7) do
      result = described_class.call(file_data: file_content, p12_data: p12_data, password: "secret")
      OpenSSL::PKCS7.new(result.signed_data)
    end

    it "has no embedded content (detached)" do
      expect(pkcs7.data).to be_nil
    end

    it "contains exactly one signer" do
      expect(pkcs7.signers.size).to eq(1)
    end
  end

  describe ".call with include_chain: false" do
    subject(:result) do
      described_class.call(
        file_data:     file_content,
        p12_data:      p12_data,
        password:      "secret",
        include_chain: false
      )
    end

    it { is_expected.to be_success }
    it { expect(result.signed_data).not_to be_nil }
  end

  describe ".call signing empty content" do
    subject(:result) do
      described_class.call(file_data: "", p12_data: p12_data, password: "secret")
    end

    it { is_expected.to be_success }
    it { expect(result.signed_data).not_to be_nil }
  end

  # ------------------------------------------------------------------ wrong password

  describe ".call with wrong password" do
    subject(:result) do
      described_class.call(file_data: file_content, p12_data: p12_data, password: "wrong")
    end

    it { is_expected.not_to be_success }
    it { expect(result.signed_data).to be_nil }

    it "returns a descriptive error" do
      expect(result.error).to include("Contraseña incorrecta")
    end
  end

  # ------------------------------------------------------------------ invalid p12 data

  describe ".call with non-p12 file data" do
    subject(:result) do
      described_class.call(file_data: file_content, p12_data: "this is garbage", password: "any")
    end

    it { is_expected.not_to be_success }
    it { expect(result.signed_data).to be_nil }
    it { expect(result.error).not_to be_nil }
  end

  describe ".call with empty p12_data" do
    subject(:result) do
      described_class.call(file_data: file_content, p12_data: "", password: "any")
    end

    it { is_expected.not_to be_success }
    it { expect(result.error).not_to be_nil }
  end
end
