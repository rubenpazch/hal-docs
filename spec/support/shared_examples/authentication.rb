# Shared examples for verifying the authentication boundary created by the
# PublicController / AuthenticatedController hierarchy.
#
# Usage — include in a `describe` block and define `make_request`:
#
#   it_behaves_like "requires authentication" do
#     def make_request
#       get "/api/v1/documents", headers: { "Accept" => "application/json" }
#     end
#   end
#
#   it_behaves_like "accessible without authentication" do
#     def make_request
#       get "/api/v1/mesa_virtual/document_types", headers: { "Accept" => "application/json" }
#     end
#   end

RSpec.shared_examples "requires authentication" do
  it "returns 401 when no JWT token is provided" do
    make_request
    expect(response).to have_http_status(:unauthorized)
  end
end

RSpec.shared_examples "accessible without authentication" do
  it "does not require a JWT token (returns 2xx or 4xx, never 401)" do
    make_request
    expect(response.status).not_to eq(401)
  end
end
