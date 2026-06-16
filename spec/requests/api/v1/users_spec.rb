require "rails_helper"

RSpec.describe "Api::V1::Users", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:headers) { auth_headers_for(admin) }

  describe "GET /api/v1/users" do
    let!(:user) { create(:user) }

    it "returns 200 with users list and meta" do
      get "/api/v1/users", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["users"]).to be_an(Array)
      expect(body["meta"]["total"]).to be >= 1
    end
  end

  describe "GET /api/v1/users/:id" do
    let!(:user) { create(:user) }

    it "returns the user with memberships" do
      get "/api/v1/users/#{user.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["user"]["id"]).to eq(user.id)
      expect(body["user"]).to have_key("area_memberships")
    end
  end

  describe "POST /api/v1/users" do
    it "creates a user and returns 201" do
      post "/api/v1/users",
           params: {
             user: {
               email: "nuevo@example.com",
               nombre: "Nuevo",
               apellido: "Usuario",
               dni: "12345678",
               role: "staff",
               password: "password123",
               password_confirmation: "password123"
             }
           },
           headers: headers, as: :json
      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["user"]["email"]).to eq("nuevo@example.com")
    end

    it "returns 422 with duplicate DNI" do
      existing = create(:user)
      post "/api/v1/users",
           params: {
             user: {
               email: "other@example.com",
               nombre: "Otro",
               apellido: "User",
               dni: existing.dni,
               password: "password123",
               password_confirmation: "password123"
             }
           },
           headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "PATCH /api/v1/users/:id" do
    let!(:user) { create(:user) }

    it "updates the user" do
      patch "/api/v1/users/#{user.id}",
            params: { user: { nombre: "Actualizado" } },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(user.reload.nombre).to eq("Actualizado")
    end
  end

  describe "DELETE /api/v1/users/:id" do
    let!(:user) { create(:user) }

    it "soft-deletes the user" do
      delete "/api/v1/users/#{user.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(user.reload.discarded_at).to be_present
    end
  end

  describe "PATCH /api/v1/users/:id/update_role" do
    let!(:user) { create(:user) }

    it "updates the user's role" do
      patch "/api/v1/users/#{user.id}/update_role",
            params: { role: "manager" },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(user.reload.role).to eq("manager")
    end
  end
end
