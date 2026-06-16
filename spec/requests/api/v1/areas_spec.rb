require "rails_helper"

RSpec.describe "Api::V1::Areas", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:headers) { auth_headers_for(admin) }

  describe "GET /api/v1/areas" do
    let!(:area) { create(:area) }

    it "returns 200 with areas and meta" do
      get "/api/v1/areas", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["areas"]).to be_an(Array)
      expect(body["meta"]["total"]).to be >= 1
    end

    it "includes children_count and members_count" do
      get "/api/v1/areas", headers: headers
      area_data = JSON.parse(response.body)["areas"].first
      expect(area_data).to have_key("children_count")
      expect(area_data).to have_key("members_count")
    end
  end

  describe "GET /api/v1/areas/:id" do
    let!(:area) { create(:area) }

    it "returns the area with memberships" do
      get "/api/v1/areas/#{area.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["area"]["id"]).to eq(area.id)
    end
  end

  describe "POST /api/v1/areas" do
    it "creates an area and returns 201" do
      post "/api/v1/areas",
           params: { area: { name: "Nueva Área", area_type: "departamento" } },
           headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["area"]["name"]).to eq("Nueva Área")
    end

    it "returns 422 with invalid data" do
      post "/api/v1/areas", params: { area: { name: "" } }, headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/areas/:id" do
    let!(:area) { create(:area) }

    it "updates the area" do
      patch "/api/v1/areas/#{area.id}",
            params: { area: { name: "Nombre Actualizado" } },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(area.reload.name).to eq("Nombre Actualizado")
    end
  end

  describe "DELETE /api/v1/areas/:id" do
    let!(:area) { create(:area) }

    it "soft-deletes the area" do
      delete "/api/v1/areas/#{area.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(area.reload.discarded_at).to be_present
    end
  end

  describe "GET /api/v1/areas/:id/members" do
    let!(:area) { create(:area) }
    let!(:user) { create(:user) }
    let!(:membership) { create(:area_membership, area: area, user: user) }

    it "returns area members" do
      get "/api/v1/areas/#{area.id}/members", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["members"]).to be_an(Array)
      expect(body["members"].first["user"]["id"]).to eq(user.id)
    end
  end

  describe "POST /api/v1/areas/:id/add_member" do
    let!(:area) { create(:area) }
    let!(:user) { create(:user) }

    it "adds a user to the area" do
      post "/api/v1/areas/#{area.id}/add_member",
           params: { user_id: user.id, position_role: "soporte" },
           headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(area.area_memberships.count).to eq(1)
    end
  end
end
