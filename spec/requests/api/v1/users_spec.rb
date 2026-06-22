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

  # ── Authentication boundary ─────────────────────────────────────────────
  describe "authentication boundary" do
    it_behaves_like "requires authentication" do
      def make_request = get("/api/v1/users", headers: { "Accept" => "application/json" })
    end
  end

  # ── Role-based authorization ────────────────────────────────────────────
  describe "GET /api/v1/users — role enforcement" do
    it_behaves_like "admin or manager required" do
      def make_request(headers) = get("/api/v1/users", headers: headers)
    end
  end

  describe "POST /api/v1/users — role enforcement" do
    it_behaves_like "admin or manager required" do
      def make_request(headers)
        post "/api/v1/users",
             params: {
               user: { email: "x@x.com", nombre: "X", apellido: "Y",
                       dni: "99887766", password: "password123",
                       password_confirmation: "password123" }
             },
             headers: headers, as: :json
      end
    end
  end

  describe "DELETE /api/v1/users/:id — only admin can delete" do
    let!(:target) { create(:user) }

    it_behaves_like "admin only" do
      def make_request(headers) = delete("/api/v1/users/#{target.id}", headers: headers)
    end
  end

  describe "PATCH /api/v1/users/:id/update_role — admin or manager" do
    let!(:target) { create(:user) }

    it_behaves_like "admin or manager required" do
      def make_request(headers)
        patch "/api/v1/users/#{target.id}/update_role",
              params: { role: "manager" }, headers: headers, as: :json
      end
    end
  end

  # ── Restore action ──────────────────────────────────────────────────────
  describe "PATCH /api/v1/users/:id/restore" do
    let!(:discarded_user) { create(:user).tap(&:discard) }

    it "reactivates a soft-deleted user" do
      patch "/api/v1/users/#{discarded_user.id}/restore", headers: headers
      expect(response).to have_http_status(:ok)
      expect(discarded_user.reload.discarded_at).to be_nil
    end

    it_behaves_like "admin only" do
      def make_request(headers)
        patch "/api/v1/users/#{discarded_user.id}/restore", headers: headers
      end
    end
  end

  # ── Staff can view and update their own profile via users#show/update ───
  describe "PATCH /api/v1/users/:id — self-service" do
    let(:staff) { create(:user) }

    it "allows staff to update their own record" do
      patch "/api/v1/users/#{staff.id}",
            params: { user: { nombre: "Actualizado" } },
            headers: auth_headers_for(staff), as: :json
      expect(response).to have_http_status(:ok)
    end

    it "blocks staff from updating another user's record" do
      other = create(:user)
      patch "/api/v1/users/#{other.id}",
            params: { user: { nombre: "Hack" } },
            headers: auth_headers_for(staff), as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end
end
