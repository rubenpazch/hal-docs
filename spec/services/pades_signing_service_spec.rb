require "rails_helper"

RSpec.describe PadesSigningService do
  # ------------------------------------------------------------------ helpers

  # Returns a minimal single-page PDF as a binary string.
  def minimal_pdf
    doc = HexaPDF::Document.new
    page = doc.pages.add
    page.canvas.font("Helvetica", size: 12).text("Documento de prueba", at: [72, 700])
    out = StringIO.new("".b)
    doc.write(out)
    out.string
  end

  # Generates an in-memory PKCS#12 with a self-signed cert.
  def generate_p12(password: "test-password", cn: "Juan Perez")
    key  = OpenSSL::PKey::RSA.generate(1024)
    cert = OpenSSL::X509::Certificate.new
    cert.version    = 2
    cert.serial     = 1
    cert.subject    = OpenSSL::X509::Name.parse("/CN=#{cn}/O=Test/C=PE")
    cert.issuer     = cert.subject
    cert.public_key = key.public_key
    cert.not_before = Time.now - 60
    cert.not_after  = Time.now + 365 * 24 * 60 * 60
    cert.sign(key, OpenSSL::Digest::SHA256.new)
    OpenSSL::PKCS12.create(password, "signer-alias", key, cert).to_der
  end

  let(:pdf_data) { minimal_pdf }
  let(:p12_data) { generate_p12(password: "secret") }

  # ------------------------------------------------------------------ success path

  describe ".call with a PDF document" do
    subject(:result) do
      described_class.call(file_data: pdf_data, p12_data: p12_data, password: "secret")
    end

    it { is_expected.to be_success }
    it { expect(result.error).to be_nil }
    it { expect(result.signed_data).not_to be_nil }

    it "produces a valid PDF (starts with %PDF)" do
      expect(result.signed_data).to start_with("%PDF")
    end

    it "produces a PDF that HexaPDF can parse" do
      doc = HexaPDF::Document.new(io: StringIO.new(result.signed_data))
      expect(doc.pages.count).to be >= 1
    end

    it "embeds a digital signature in the PDF" do
      doc  = HexaPDF::Document.new(io: StringIO.new(result.signed_data))
      sigs = doc.signatures.to_a
      expect(sigs).not_to be_empty
    end

    it "uses the ETSI.CAdES.detached (PAdES) sub-filter" do
      doc = HexaPDF::Document.new(io: StringIO.new(result.signed_data))
      sig = doc.signatures.first
      expect(sig[:SubFilter].to_s).to eq("ETSI.CAdES.detached")
    end
  end

  # ------------------------------------------------------------------ visible signature

  describe ".call with signature position" do
    subject(:result) do
      described_class.call(
        file_data:      pdf_data,
        p12_data:       p12_data,
        password:       "secret",
        signature_page: 1,
        signature_x:    10.0,
        signature_y:    80.0
      )
    end

    it { is_expected.to be_success }

    it "creates a visible signature field in the AcroForm" do
      doc  = HexaPDF::Document.new(io: StringIO.new(result.signed_data))
      form = doc.acro_form
      expect(form).not_to be_nil
      sig_fields = form.each_field.select { |f| f.field_type == :Sig }
      expect(sig_fields).not_to be_empty
    end

    it "the signature widget has a non-zero rect" do
      doc    = HexaPDF::Document.new(io: StringIO.new(result.signed_data))
      widget = doc.acro_form.each_field.find { |f| f.field_type == :Sig }
                  .each_widget.first
      rect = widget[:Rect].value
      expect(rect[2] - rect[0]).to be > 0  # width
      expect(rect[3] - rect[1]).to be > 0  # height
    end
  end

  # ------------------------------------------------------------------ wrong password

  describe ".call with wrong password" do
    subject(:result) do
      described_class.call(file_data: pdf_data, p12_data: p12_data, password: "wrong")
    end

    it { is_expected.not_to be_success }
    it { expect(result.signed_data).to be_nil }
    it { expect(result.error).to include("Contraseña incorrecta") }
  end

  # ------------------------------------------------------------------ invalid p12

  describe ".call with invalid p12 data" do
    subject(:result) do
      described_class.call(file_data: pdf_data, p12_data: "garbage", password: "any")
    end

    it { is_expected.not_to be_success }
    it { expect(result.error).not_to be_nil }
  end
end
