require "rails_helper"

RSpec.describe "Api::V1::DigitalCertificates", type: :request do
  let(:user)    { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "GET /api/v1/digital_certificates" do
    let!(:cert) { create(:digital_certificate, user: user) }

    it "returns the user's certificates" do
      get "/api/v1/digital_certificates", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["certificates"]).to be_an(Array)
      expect(body["certificates"].first["id"]).to eq(cert.id)
      expect(body["certificates"].first).to have_key("status")
      expect(body["certificates"].first).to have_key("expired")
    end

    it "does not return other users' certificates" do
      other = create(:digital_certificate, user: create(:user))
      get "/api/v1/digital_certificates", headers: headers
      ids = JSON.parse(response.body)["certificates"].map { |c| c["id"] }
      expect(ids).not_to include(other.id)
    end
  end

  describe "GET /api/v1/digital_certificates/:id" do
    let!(:cert) { create(:digital_certificate, user: user) }

    it "returns the certificate details" do
      get "/api/v1/digital_certificates/#{cert.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["certificate"]["id"]).to eq(cert.id)
    end

    it "returns 404 for another user's certificate" do
      other_cert = create(:digital_certificate, user: create(:user))
      get "/api/v1/digital_certificates/#{other_cert.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/v1/digital_certificates/:id" do
    let!(:cert) { create(:digital_certificate, user: user) }

    it "soft-deletes the certificate" do
      delete "/api/v1/digital_certificates/#{cert.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(cert.reload.discarded_at).to be_present
    end
  end

  describe "PATCH /api/v1/digital_certificates/:id/set_default" do
    let!(:cert1) { create(:digital_certificate, user: user, is_default: true) }
    let!(:cert2) { create(:digital_certificate, user: user, is_default: false) }

    it "marks the certificate as default and clears others" do
      patch "/api/v1/digital_certificates/#{cert2.id}/set_default", headers: headers, as: :json
      expect(response).to have_http_status(:ok)
      expect(cert2.reload.is_default).to be true
      expect(cert1.reload.is_default).to be false
    end
  end
end
