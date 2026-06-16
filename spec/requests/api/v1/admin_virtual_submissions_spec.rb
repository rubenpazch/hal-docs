require "rails_helper"

RSpec.describe "Api::V1::AdminVirtualSubmissions", type: :request do
  let(:admin)    { create(:user, :admin) }
  let(:area)     { create(:area) }
  let(:doc_type) { create(:document_type) }
  let(:headers)  { auth_headers_for(admin) }

  describe "GET /api/v1/admin/virtual_submissions" do
    let!(:submission) { create(:virtual_submission, document_type: doc_type) }

    it "returns submissions with timeline" do
      get "/api/v1/admin/virtual_submissions", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["submissions"]).to be_an(Array)
      expect(body["submissions"].first).to have_key("timeline")
      expect(body["meta"]).to include("total", "per_page")
    end

    it "returns 401 without authentication" do
      get "/api/v1/admin/virtual_submissions", headers: { "Accept" => "application/json" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "filters by status" do
      create(:virtual_submission, document_type: doc_type, status: :en_revision)
      get "/api/v1/admin/virtual_submissions", params: { status: "registrado" }, headers: headers
      body = JSON.parse(response.body)
      expect(body["submissions"].map { |s| s["status"] }).to all(eq("registrado"))
    end
  end

  describe "GET /api/v1/admin/virtual_submissions/:id" do
    let!(:submission) { create(:virtual_submission, document_type: doc_type) }

    it "returns the submission with full details" do
      get "/api/v1/admin/virtual_submissions/#{submission.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["submission"]["id"]).to eq(submission.id)
      expect(body["submission"]["document_type"]).to include("id", "name", "code")
    end
  end

  describe "PATCH /api/v1/admin/virtual_submissions/:id/update_status" do
    let!(:submission) { create(:virtual_submission, document_type: doc_type) }

    it "updates submission status and records a flow" do
      expect {
        patch "/api/v1/admin/virtual_submissions/#{submission.id}/update_status",
              params: { status: "en_revision" },
              headers: headers, as: :json
      }.to change { submission.flows.count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(submission.reload.status).to eq("en_revision")
    end

    it "requires to_area_id when deriving" do
      patch "/api/v1/admin/virtual_submissions/#{submission.id}/update_status",
            params: { status: "derivado" },
            headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "derives to an area when to_area_id is provided" do
      patch "/api/v1/admin/virtual_submissions/#{submission.id}/update_status",
            params: { status: "derivado", to_area_id: area.id },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(submission.reload.to_area_id).to eq(area.id)
    end
  end
end
