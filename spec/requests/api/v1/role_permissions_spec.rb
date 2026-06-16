require "rails_helper"

RSpec.describe "Api::V1::RolePermissions", type: :request do
  let(:admin) { create(:user, :admin) }
  let(:staff) { create(:user) }
  let(:admin_headers) { auth_headers_for(admin) }
  let(:staff_headers) { auth_headers_for(staff) }

  describe "GET /api/v1/role_permissions/my_permissions" do
    it "returns permissions for the current user's role" do
      get "/api/v1/role_permissions/my_permissions", headers: staff_headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["permissions"]).to be_a(Hash)
      expect(body["permissions"].keys).to match_array(RolePermission::PAGE_KEYS)
    end
  end

  describe "GET /api/v1/role_permissions" do
    it "returns full permission matrix for admin" do
      get "/api/v1/role_permissions", headers: admin_headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["permissions"].keys).to match_array(RolePermission::ROLES)
      expect(body["page_keys"]).to match_array(RolePermission::PAGE_KEYS)
    end

    it "returns 403 for non-admin" do
      get "/api/v1/role_permissions", headers: staff_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/role_permissions/update_batch" do
    it "updates permissions for admin" do
      patch "/api/v1/role_permissions/update_batch",
            params: { permissions: { "staff" => { "dashboard" => false } } },
            headers: admin_headers, as: :json
      expect(response).to have_http_status(:ok)
    end

    it "returns 403 for non-admin" do
      patch "/api/v1/role_permissions/update_batch",
            params: { permissions: {} },
            headers: staff_headers, as: :json
      expect(response).to have_http_status(:forbidden)
    end
  end
end
