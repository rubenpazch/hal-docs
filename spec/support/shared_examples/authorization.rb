# Shared examples for verifying Pundit role-based access control.
#
# Usage — include in a `describe` block and define `make_request(headers)`:
#
#   it_behaves_like "admin or manager required" do
#     def make_request(headers)
#       patch "/api/v1/documents/#{document.id}/update_status",
#             params: { status: "en_proceso" }, headers: headers, as: :json
#     end
#   end

RSpec.shared_examples "admin or manager required" do
  context "when the requester is staff" do
    it "returns 403 Forbidden" do
      make_request(auth_headers_for(create(:user)))
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "when the requester is manager" do
    it "permits access" do
      make_request(auth_headers_for(create(:user, :manager)))
      expect(response).not_to have_http_status(:forbidden)
    end
  end

  context "when the requester is admin" do
    it "permits access" do
      make_request(auth_headers_for(create(:user, :admin)))
      expect(response).not_to have_http_status(:forbidden)
    end
  end
end

RSpec.shared_examples "admin only" do
  context "when the requester is staff" do
    it "returns 403 Forbidden" do
      make_request(auth_headers_for(create(:user)))
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "when the requester is manager" do
    it "returns 403 Forbidden" do
      make_request(auth_headers_for(create(:user, :manager)))
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "when the requester is admin" do
    it "permits access" do
      make_request(auth_headers_for(create(:user, :admin)))
      expect(response).not_to have_http_status(:forbidden)
    end
  end
end
