require "rails_helper"

RSpec.describe "Api::V1::DocumentTypes", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:headers) { auth_headers_for(admin) }

  describe "GET /api/v1/document_types" do
    let!(:dt) { create(:document_type) }

    it "returns active document types" do
      create(:document_type, is_active: false)
      get "/api/v1/document_types", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["document_types"].map { |t| t["is_active"] }).to all(be true)
    end
  end

  describe "GET /api/v1/document_types/:id" do
    let!(:dt) { create(:document_type) }

    it "returns the document type" do
      get "/api/v1/document_types/#{dt.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["document_type"]["id"]).to eq(dt.id)
    end
  end

  describe "POST /api/v1/document_types" do
    it "creates a document type" do
      post "/api/v1/document_types",
           params: { document_type: { name: "Oficio", code: "OFI", description: "Documento oficio" } },
           headers: headers, as: :json
      expect(response).to have_http_status(:created)
    end

    it "returns 422 with duplicate code" do
      create(:document_type, code: "DUPE")
      post "/api/v1/document_types",
           params: { document_type: { name: "Other", code: "DUPE" } },
           headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/document_types/:id" do
    let!(:dt) { create(:document_type) }

    it "updates the document type" do
      patch "/api/v1/document_types/#{dt.id}",
            params: { document_type: { name: "Nuevo Nombre" } },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(dt.reload.name).to eq("Nuevo Nombre")
    end
  end

  describe "DELETE /api/v1/document_types/:id" do
    let!(:dt) { create(:document_type) }

    it "deactivates the document type" do
      delete "/api/v1/document_types/#{dt.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(dt.reload.is_active).to be false
    end
  end
end
