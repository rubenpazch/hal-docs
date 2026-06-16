require "rails_helper"

RSpec.describe "Api::V1::Profile", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "GET /api/v1/me" do
    it "returns the current user profile" do
      get "/api/v1/me", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["user"]["id"]).to eq(user.id)
      expect(body["user"]["email"]).to eq(user.email)
    end

    it "returns 401 without authentication" do
      get "/api/v1/me", headers: { "Accept" => "application/json" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "PATCH /api/v1/me" do
    it "updates profile fields" do
      patch "/api/v1/me",
            params: { user: { nombre: "Nuevo Nombre", apellido: "Nuevo Apellido" } },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(user.reload.nombre).to eq("Nuevo Nombre")
    end

    it "returns 422 with invalid data" do
      patch "/api/v1/me",
            params: { user: { nombre: "" } },
            headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "PATCH /api/v1/me/password" do
    it "returns 422 when current password is wrong" do
      patch "/api/v1/me/password",
            params: { current_password: "wrongpassword", password: "newpass123", password_confirmation: "newpass123" },
            headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "updates the password when current password is correct" do
      patch "/api/v1/me/password",
            params: { current_password: "password123", password: "newpassword!", password_confirmation: "newpassword!" },
            headers: headers, as: :json
      expect(response).to have_http_status(:ok)
    end
  end
end
