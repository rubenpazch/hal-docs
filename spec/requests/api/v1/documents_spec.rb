require "rails_helper"

RSpec.describe "Api::V1::Documents", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:area)  { create(:area) }
  let(:doc_type) { create(:document_type) }
  let(:headers) { auth_headers_for(admin) }

  describe "GET /api/v1/documents" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "returns 200 and the documents list" do
      get "/api/v1/documents", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["documents"]).to be_an(Array)
      expect(body["meta"]).to include("total", "per_page", "current_page")
    end

    it "returns 401 without authentication" do
      get "/api/v1/documents", headers: { "Accept" => "application/json" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "filters by status" do
      create(:document, :archivado, document_type: doc_type, area: area, created_by: admin)
      get "/api/v1/documents", params: { status: "registrado" }, headers: headers
      body = JSON.parse(response.body)
      expect(body["documents"].map { |d| d["status"] }).to all(eq("registrado"))
    end
  end

  describe "GET /api/v1/documents/:id" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "returns the document with full details" do
      get "/api/v1/documents/#{document.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["document"]["id"]).to eq(document.id)
      expect(body["document"]["document_type"]).to include("id", "name", "code")
    end

    it "returns 404 for non-existent document" do
      get "/api/v1/documents/99999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/documents" do
    let(:valid_params) do
      {
        document: {
          subject:          "Test document",
          sender:           "Remitente",
          recipient:        "Destinatario",
          document_type_id: doc_type.id,
          area_id:          area.id,
          priority:         "media"
        }
      }
    end

    it "creates a document and returns 201" do
      post "/api/v1/documents", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["document"]["subject"]).to eq("Test document")
      expect(body["document"]["document_flows"]).not_to be_empty
    end

    it "returns 422 with missing required fields" do
      post "/api/v1/documents", params: { document: { subject: "" } }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to have_key("errors")
    end
  end

  describe "PATCH /api/v1/documents/:id" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "updates the document" do
      patch "/api/v1/documents/#{document.id}",
            params: { document: { subject: "Updated subject" } },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["document"]["subject"]).to eq("Updated subject")
    end
  end

  describe "DELETE /api/v1/documents/:id" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "sets status to anulado" do
      delete "/api/v1/documents/#{document.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(document.reload.status).to eq("anulado")
    end
  end

  describe "PATCH /api/v1/documents/:id/update_status" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "changes the document status and records a flow event" do
      expect {
        patch "/api/v1/documents/#{document.id}/update_status",
              params: { status: "derivado" },
              headers: headers, as: :json
      }.to change { document.document_flows.count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(document.reload.status).to eq("derivado")
    end
  end

  describe "GET /api/v1/documents/mine" do
    it "returns only documents created by the current user" do
      other_user = create(:user)
      create(:document, document_type: doc_type, area: area, created_by: admin)
      create(:document, document_type: doc_type, area: area, created_by: other_user)

      get "/api/v1/documents/mine", headers: headers
      body = JSON.parse(response.body)
      expect(body["documents"].map { |d| d["id"] }).to all(satisfy { |id|
        Document.find(id).created_by_id == admin.id
      })
    end
  end
end
