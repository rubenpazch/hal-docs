require "rails_helper"

RSpec.describe FirmaPeruService do
  # ------------------------------------------------------------------ fake attachment

  # Minimal duck-type of ActiveStorage::Attachment.
  # Avoids DB/storage setup while satisfying the interface FirmaPeruService expects.
  let(:pdf_attachment) do
    filename = "document.pdf"
    double("attachment",
      attached?:  true,
      filename:   filename,
      open: nil
    ).tap do |a|
      allow(a).to receive(:open) do |&block|
        Tempfile.create(["firma_test", ".pdf"]) do |f|
          f.binmode
          f.write("fake pdf bytes")
          f.rewind
          block.call(f)
        end
      end
    end
  end

  let(:unattached_file) { double("attachment", attached?: false) }

  # ------------------------------------------------------------------ API response fixtures

  let(:valid_body) do
    {
      "result"         => "RESULTADO VÁLIDO",
      "listSignatures" => [ { "number" => 1, "signer" => "JUAN PEREZ", "status" => "VÁLIDO" } ],
      "errorMessage"   => ""
    }
  end

  let(:invalid_body) do
    { "result" => "RESULTADO NO VÁLIDO", "listSignatures" => [], "errorMessage" => "" }
  end

  let(:indeterminate_body) do
    { "result" => "RESULTADO INDETERMINADO", "listSignatures" => [], "errorMessage" => "" }
  end

  let(:no_signatures_body) do
    { "result" => "SIN FIRMAS DIGITALES", "listSignatures" => [], "errorMessage" => "" }
  end

  # ------------------------------------------------------------------ service factory helpers

  # Returns a subclass of FirmaPeruService with a Faraday test adapter for HTTP calls.
  def build_service(post_body: nil, get_body: nil)
    stubs = Faraday::Adapter::Test::Stubs.new do |s|
      s.post("/api/validation") { [200, { "Content-Type" => "application/json" }, post_body.to_json] } if post_body
      s.get("/api/info")        { [200, { "Content-Type" => "application/json" }, get_body.to_json]  } if get_body
    end

    Class.new(described_class) do
      define_method(:multipart_connection) do
        Faraday.new(url: "http://test.local") do |b|
          b.request :multipart
          b.request :url_encoded
          b.adapter :test, stubs
        end
      end

      define_method(:connection) do
        Faraday.new(url: "http://test.local") { |b| b.adapter :test, stubs }
      end
    end.new
  end

  # Returns a service whose private #call_validation_api raises the given error.
  def service_raising(error)
    Class.new(described_class) do
      private
      define_method(:call_validation_api) { |*_| raise error }
    end.new
  end

  # ------------------------------------------------------------------ validate: result types

  describe "#validate result types" do
    context "when API returns RESULTADO VÁLIDO" do
      subject(:result) { build_service(post_body: valid_body).validate(attachment: pdf_attachment) }

      it { is_expected.to be_available }
      it { is_expected.to be_valid }
      it { expect(result.result_text).to eq("RESULTADO VÁLIDO") }
      it { expect(result.signatures.size).to eq(1) }
      it { expect(result.signatures.first["signer"]).to eq("JUAN PEREZ") }
    end

    context "when API returns RESULTADO NO VÁLIDO" do
      subject(:result) { build_service(post_body: invalid_body).validate(attachment: pdf_attachment) }

      it { is_expected.to be_available }
      it { is_expected.not_to be_valid }
      it { expect(result.result_text).to eq("RESULTADO NO VÁLIDO") }
      it { expect(result.signatures).to be_empty }
    end

    context "when API returns RESULTADO INDETERMINADO" do
      subject(:result) { build_service(post_body: indeterminate_body).validate(attachment: pdf_attachment) }

      it { is_expected.to be_available }
      it { is_expected.not_to be_valid }
      it { expect(result.result_text).to eq("RESULTADO INDETERMINADO") }
    end

    context "when API returns SIN FIRMAS DIGITALES" do
      subject(:result) { build_service(post_body: no_signatures_body).validate(attachment: pdf_attachment) }

      it { is_expected.to be_available }
      it { is_expected.not_to be_valid }
      it { expect(result.result_text).to eq("SIN FIRMAS DIGITALES") }
      it { expect(result.signatures).to be_empty }
    end
  end

  # ------------------------------------------------------------------ validate: error handling

  describe "#validate error handling" do
    context "when connection is refused (Faraday::ConnectionFailed)" do
      subject(:result) { service_raising(Faraday::ConnectionFailed.new("connection refused")).validate(attachment: pdf_attachment) }

      it { is_expected.not_to be_available }
      it { expect(result.valid).to be_nil }
      it { expect(result.error).to include("connection refused") }
      it { expect(result.error).to include("FIRMA PERÚ") }
    end

    context "when request times out (Faraday::TimeoutError)" do
      subject(:result) { service_raising(Faraday::TimeoutError.new("timed out")).validate(attachment: pdf_attachment) }

      it { is_expected.not_to be_available }
      it { expect(result.valid).to be_nil }
      it { expect(result.error).to include("timed out") }
      it { expect(result.error).to include("FIRMA PERÚ") }
    end

    context "when response body is not valid JSON" do
      subject(:result) do
        stubs = Faraday::Adapter::Test::Stubs.new do |s|
          s.post("/api/validation") { [200, {}, "not json { at all"] }
        end
        svc = Class.new(described_class) do
          define_method(:multipart_connection) do
            Faraday.new(url: "http://test.local") { |b| b.request(:multipart); b.request(:url_encoded); b.adapter(:test, stubs) }
          end
        end.new
        svc.validate(attachment: pdf_attachment)
      end

      it { is_expected.not_to be_available }
      it { expect(result.valid).to be_nil }
      it { expect(result.error).to include("Respuesta inválida del servicio") }
    end

    context "when attachment is not attached" do
      subject(:result) { described_class.new.validate(attachment: unattached_file) }

      it { is_expected.not_to be_available }
      it { expect(result.error).to include("attachment must be attached") }
    end

    context "when an unexpected StandardError occurs" do
      subject(:result) { service_raising(RuntimeError.new("unexpected boom")).validate(attachment: pdf_attachment) }

      it { is_expected.not_to be_available }
      it { expect(result.error).to eq("unexpected boom") }
    end

    context "when API body contains a non-blank errorMessage" do
      let(:body_with_error) { invalid_body.merge("errorMessage" => "Certificado revocado") }
      subject(:result) { build_service(post_body: body_with_error).validate(attachment: pdf_attachment) }

      it { is_expected.not_to be_available }
      it { expect(result.error).to eq("Certificado revocado") }
    end
  end

  # ------------------------------------------------------------------ info

  describe "#info" do
    let(:info_body) do
      {
        "home"                => "/home/tomcat/PCM/Validador",
        "credentials.json"    => "/home/tomcat/PCM/Validador/credentials.json - true",
        "vAuthorization.json" => "/home/tomcat/PCM/Validador/vAuthorization.json - true"
      }
    end

    context "when service is reachable" do
      subject(:result) { build_service(get_body: info_body).info }

      it { is_expected.to be_a(Hash) }
      it { is_expected.to have_key("home") }
      it { expect(result["credentials.json"]).to include("true") }
    end

    context "when service is not reachable" do
      subject(:result) do
        Class.new(described_class) do
          define_method(:connection) { raise Faraday::ConnectionFailed, "refused" }
        end.new.info
      end

      it { is_expected.to be_nil }
    end

    context "when response body is not valid JSON" do
      subject(:result) do
        stubs = Faraday::Adapter::Test::Stubs.new { |s| s.get("/api/info") { [200, {}, "bad json"] } }
        Class.new(described_class) do
          define_method(:connection) { Faraday.new(url: "http://test.local") { |b| b.adapter :test, stubs } }
        end.new.info
      end

      it { is_expected.to be_nil }
    end
  end

  # ------------------------------------------------------------------ Result struct

  describe "Result" do
    describe "#available?" do
      it "is true when error is nil" do
        result = described_class::Result.new(valid: true, result_text: nil, signatures: [], raw: {}, error: nil)
        expect(result).to be_available
      end

      it "is false when error is present" do
        result = described_class::Result.new(valid: nil, result_text: nil, signatures: [], raw: {}, error: "oops")
        expect(result).not_to be_available
      end
    end

    describe "#valid?" do
      it "returns true when valid is true"  do
        expect(described_class::Result.new(valid: true,  result_text: nil, signatures: [], raw: {}, error: nil)).to be_valid
      end

      it "returns false when valid is false" do
        expect(described_class::Result.new(valid: false, result_text: nil, signatures: [], raw: {}, error: nil)).not_to be_valid
      end

      it "returns nil when valid is nil" do
        expect(described_class::Result.new(valid: nil, result_text: nil, signatures: [], raw: {}, error: nil).valid?).to be_nil
      end
    end
  end
end
