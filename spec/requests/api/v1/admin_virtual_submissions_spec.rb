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
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "derives to an area when to_area_id is provided" do
      patch "/api/v1/admin/virtual_submissions/#{submission.id}/update_status",
            params: { status: "derivado", to_area_id: area.id },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(submission.reload.to_area_id).to eq(area.id)
    end
  end

  # ── Bandeja del área ─────────────────────────────────────────────────────
  describe "GET /api/v1/admin/bandeja/virtual_submissions" do
    let(:manager)    { create(:user, :manager, area: area) }
    let(:other_area) { create(:area) }

    before do
      create(:virtual_submission, document_type: doc_type, to_area: area)
      create(:virtual_submission, document_type: doc_type, to_area: other_area)
    end

    it "returns only submissions routed to the current user's area" do
      get "/api/v1/admin/bandeja/virtual_submissions", headers: auth_headers_for(manager)
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["submissions"]).to be_an(Array)
      expect(body["submissions"].map { |s| s.dig("to_area", "id") }).to all(eq(area.id))
    end

    it "returns empty list when user has no area assigned" do
      staff = create(:user)
      get "/api/v1/admin/bandeja/virtual_submissions", headers: auth_headers_for(staff)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["submissions"]).to be_empty
    end

    it "filters by status" do
      create(:virtual_submission, document_type: doc_type, to_area: area, status: :en_revision)
      get "/api/v1/admin/bandeja/virtual_submissions",
          params: { status: "registrado" },
          headers: auth_headers_for(manager)
      body = JSON.parse(response.body)
      expect(body["submissions"].map { |s| s["status"] }).to all(eq("registrado"))
    end
  end

  # ── Authentication boundary ─────────────────────────────────────────────
  describe "authentication boundary" do
    it_behaves_like "requires authentication" do
      def make_request
        get "/api/v1/admin/virtual_submissions", headers: { "Accept" => "application/json" }
      end
    end

    it_behaves_like "requires authentication" do
      def make_request
        get "/api/v1/admin/bandeja/virtual_submissions", headers: { "Accept" => "application/json" }
      end
    end
  end

  # ── Role-based authorization ────────────────────────────────────────────
  describe "PATCH update_status — admin or manager required" do
    let!(:submission) { create(:virtual_submission, document_type: doc_type) }

    it_behaves_like "admin or manager required" do
      def make_request(headers)
        patch "/api/v1/admin/virtual_submissions/#{submission.id}/update_status",
              params: { status: "en_revision" }, headers: headers, as: :json
      end
    end
  end
end
