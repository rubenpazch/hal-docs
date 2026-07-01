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

  # ------------------------------------------------------------------ CAdES-BES attribute verification

  describe ".call produces CAdES-BES signed attributes" do
    # Parse signed attributes from the raw DER output.
    # OpenSSL::ASN1::ObjectId#value returns the long name for known OIDs,
    # so use #oid to always get the dotted-decimal representation.
    def extract_oids(signed_data_der)
      content_info = OpenSSL::ASN1.decode(signed_data_der)
      signed_data  = content_info.value[1].value[0]   # unwrap explicit [0] tag
      signer_info  = signed_data.value[4].value[0]    # signerInfos SET → first SignerInfo
      # signedAttrs is [0] IMPLICIT; re-tag as SET (0x31) before parsing
      sa_der       = signer_info.value[3].to_der
      set_der      = "\x31".b + sa_der[1..]
      OpenSSL::ASN1.decode(set_der).value.map { |attr| attr.value[0].oid }
    end

    subject(:oids) do
      result = described_class.call(file_data: file_content, p12_data: p12_data, password: "secret")
      extract_oids(result.signed_data)
    end

    it "contains the signing-certificate-v2 attribute (id-aa-signingCertificateV2)" do
      expect(oids).to include(DocumentSigningService::SIGNING_CERT_V2_OID)
    end

    it "contains the content-type attribute" do
      expect(oids).to include(DocumentSigningService::CONTENT_TYPE_OID)
    end

    it "contains the message-digest attribute" do
      expect(oids).to include(DocumentSigningService::MESSAGE_DIGEST_OID)
    end

    it "message-digest matches SHA-256 of the file content" do
      result   = described_class.call(file_data: file_content, p12_data: p12_data, password: "secret")
      ci       = OpenSSL::ASN1.decode(result.signed_data)
      sd       = ci.value[1].value[0]
      si       = sd.value[4].value[0]
      sa_der   = "\x31".b + si.value[3].to_der[1..]
      attrs    = OpenSSL::ASN1.decode(sa_der).value
      md_attr  = attrs.find { |a| a.value[0].oid == DocumentSigningService::MESSAGE_DIGEST_OID }
      embedded = md_attr.value[1].value[0].value
      expected = OpenSSL::Digest::SHA256.digest(file_content)
      expect(embedded).to eq(expected)
    end
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
