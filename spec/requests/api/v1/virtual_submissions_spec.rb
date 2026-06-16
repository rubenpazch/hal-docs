require "rails_helper"

RSpec.describe "Api::V1::VirtualSubmissions (public)", type: :request do
  let(:doc_type) { create(:document_type) }

  let(:json_headers) { { "Accept" => "application/json", "Content-Type" => "application/json" } }

  describe "GET /api/v1/mesa_virtual/document_types" do
    before { create_list(:document_type, 3) }

    it "returns active document types without authentication" do
      get "/api/v1/mesa_virtual/document_types", headers: json_headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["document_types"]).to be_an(Array)
      expect(body["document_types"].first).to include("id", "name", "code")
    end
  end

  describe "POST /api/v1/mesa_virtual/submit" do
    let(:valid_params) do
      {
        submission: {
          submitter_type:     "natural",
          submitter_name:     "Juan Pérez",
          submitter_document: "45603792",
          submitter_email:    "juan@example.com",
          submitter_phone:    "987654321",
          subject:            "Solicitud de información",
          document_type_id:   doc_type.id,
          folio_count:        1
        }
      }
    end

    it "creates a submission without authentication and returns 201" do
      post "/api/v1/mesa_virtual/submit", params: valid_params, headers: json_headers, as: :json
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["submission"]["tracking_number"]).to match(/\AVT-/)
    end

    it "returns 422 with missing required fields" do
      post "/api/v1/mesa_virtual/submit",
           params: { submission: { submitter_type: "natural" } },
           headers: json_headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "requires company fields for juridica type" do
      params = valid_params.deep_merge(submission: { submitter_type: "juridica", company_name: nil })
      post "/api/v1/mesa_virtual/submit", params: params, headers: json_headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/v1/mesa_virtual/track" do
    let!(:submission) { create(:virtual_submission, document_type: doc_type) }

    it "tracks by tracking_number" do
      get "/api/v1/mesa_virtual/track",
          params: { tracking_number: submission.tracking_number },
          headers: json_headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["submissions"].first["tracking_number"]).to eq(submission.tracking_number)
    end

    it "tracks by submitter document" do
      get "/api/v1/mesa_virtual/track",
          params: { document: submission.submitter_document },
          headers: json_headers
      expect(response).to have_http_status(:ok)
    end

    it "returns 400 without any tracking parameter" do
      get "/api/v1/mesa_virtual/track", headers: json_headers
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 404 when no submission found" do
      get "/api/v1/mesa_virtual/track",
          params: { tracking_number: "VT-9999-9999999" },
          headers: json_headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
