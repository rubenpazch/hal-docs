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
      expect(response).to have_http_status(:unprocessable_content)
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
              params: { status: "en_proceso" },
              headers: headers, as: :json
      }.to change { document.document_flows.count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(document.reload.status).to eq("en_proceso")
    end

    it "returns 422 when deriving without a destination area" do
      patch "/api/v1/documents/#{document.id}/update_status",
            params: { status: "derivado" },
            headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 for an invalid transition" do
      patch "/api/v1/documents/#{document.id}/update_status",
            params: { status: "finalizado" },
            headers: headers, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
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

  # ── Authentication boundary ─────────────────────────────────────────────
  describe "authentication boundary" do
    it_behaves_like "requires authentication" do
      def make_request = get("/api/v1/documents", headers: { "Accept" => "application/json" })
    end

    it_behaves_like "requires authentication" do
      def make_request = post("/api/v1/documents", headers: { "Accept" => "application/json" })
    end
  end

  # ── Role-based authorization ────────────────────────────────────────────
  describe "PATCH /api/v1/documents/:id/update_status — role enforcement" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it_behaves_like "admin or manager required" do
      def make_request(headers)
        patch "/api/v1/documents/#{document.id}/update_status",
              params: { status: "en_proceso" }, headers: headers, as: :json
      end
    end
  end

  describe "DELETE /api/v1/documents/:id — role enforcement" do
    let!(:document) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it_behaves_like "admin or manager required" do
      def make_request(headers)
        delete "/api/v1/documents/#{document.id}", headers: headers
      end
    end
  end

  describe "PATCH /api/v1/documents/:id — ownership enforcement" do
    let(:staff)     { create(:user) }
    let(:own_doc)   { create(:document, document_type: doc_type, area: area, created_by: staff) }
    let(:other_doc) { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "allows staff to update their own document" do
      patch "/api/v1/documents/#{own_doc.id}",
            params: { document: { subject: "Staff update" } },
            headers: auth_headers_for(staff), as: :json
      expect(response).to have_http_status(:ok)
    end

    it "blocks staff from updating another user's document" do
      patch "/api/v1/documents/#{other_doc.id}",
            params: { document: { subject: "Unauthorized update" } },
            headers: auth_headers_for(staff), as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ── Derive action (update_status + to_area_id) ──────────────────────────
  describe "PATCH /api/v1/documents/:id/update_status — derivar" do
    let!(:target_area) { create(:area) }
    let!(:document)    { create(:document, document_type: doc_type, area: area, created_by: admin) }

    it "routes the document to the target area and records the flow" do
      patch "/api/v1/documents/#{document.id}/update_status",
            params: { status: "derivado", to_area_id: target_area.id, observations: "Para revisión" },
            headers: headers, as: :json

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(document.reload.area_id).to eq(target_area.id)
      expect(body["document"]["status"]).to eq("derivado")
      flow = document.document_flows.last
      expect(flow.action).to eq("derivado")
      expect(flow.to_area_id).to eq(target_area.id)
      expect(flow.observations).to eq("Para revisión")
    end
  end

  # ── Search endpoint ─────────────────────────────────────────────────────
  describe "GET /api/v1/documents/search" do
    before do
      create(:document, subject: "Informe técnico anual", document_type: doc_type,
             area: area, created_by: admin)
      create(:document, subject: "Oficio de respuesta", document_type: doc_type,
             area: area, created_by: admin)
    end

    it "returns matching documents" do
      get "/api/v1/documents/search", params: { q: { subject_cont: "Informe" } }, headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["documents"]).to be_an(Array)
      expect(body["documents"].map { |d| d["subject"] }).to all(include("Informe"))
    end

    it "returns empty array when nothing matches" do
      get "/api/v1/documents/search", params: { q: { subject_cont: "XYZNOTFOUND" } }, headers: headers
      expect(JSON.parse(response.body)["documents"]).to be_empty
    end
  end

  # ── Filter by priority ──────────────────────────────────────────────────
  describe "GET /api/v1/documents — filter by priority" do
    before do
      create(:document, :urgente, document_type: doc_type, area: area, created_by: admin)
      create(:document, document_type: doc_type, area: area, created_by: admin) # media
    end

    it "returns only documents with the requested priority" do
      get "/api/v1/documents", params: { priority: "urgente" }, headers: headers
      body = JSON.parse(response.body)
      expect(body["documents"].map { |d| d["priority"] }).to all(eq("urgente"))
    end
  end
end
