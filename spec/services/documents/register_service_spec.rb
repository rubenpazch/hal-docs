require "rails_helper"

RSpec.describe Documents::RegisterService do
  let(:area)     { create(:area) }
  let(:doc_type) { create(:document_type) }
  let(:user)     { create(:user) }

  let(:valid_params) do
    {
      subject:          "Informe técnico mensual",
      sender:           "Jefe de Área",
      recipient:        "Gerencia General",
      document_type_id: doc_type.id,
      area_id:          area.id,
      priority:         "media"
    }
  end

  describe ".call with valid params" do
    subject(:result) { described_class.call(params: valid_params, performed_by: user) }

    it { is_expected.to be_success }
    it { expect(result.errors).to be_empty }

    it "persists the document" do
      expect { result }.to change(Document, :count).by(1)
    end

    it "assigns the performed_by user as created_by" do
      expect(result.document.created_by).to eq(user)
    end

    it "sets the document status to registrado" do
      expect(result.document.status).to eq("registrado")
    end

    it "creates one DocumentFlow record with action registrado" do
      expect { result }.to change(DocumentFlow, :count).by(1)
      flow = result.document.document_flows.first
      expect(flow.action).to eq("registrado")
      expect(flow.from_status).to be_nil
      expect(flow.to_status).to eq("registrado")
      expect(flow.performed_by).to eq(user)
    end

    it "sets to_area on the flow to the document's area" do
      flow = result.document.document_flows.first
      expect(flow.to_area).to eq(area)
    end

    it "returns the document with associations already loaded" do
      doc = result.document
      expect(doc.document_type).not_to be_nil
      expect(doc.area).not_to be_nil
      expect(doc.document_flows).not_to be_empty
    end

    it "auto-assigns a document_number" do
      expect(result.document.document_number).to be_present
    end
  end

  describe ".call with invalid params" do
    let(:invalid_params) { valid_params.merge(subject: "") }
    subject(:result) { described_class.call(params: invalid_params, performed_by: user) }

    it { is_expected.not_to be_success }

    it "does not persist the document" do
      expect { result }.not_to change(Document, :count)
    end

    it "does not create a DocumentFlow" do
      expect { result }.not_to change(DocumentFlow, :count)
    end

    it "returns validation errors" do
      expect(result.errors).not_to be_empty
    end
  end

  describe ".call without an area" do
    let(:params_without_area) { valid_params.except(:area_id) }
    subject(:result) { described_class.call(params: params_without_area, performed_by: user) }

    it { is_expected.to be_success }

    it "creates a flow with nil to_area" do
      flow = result.document.document_flows.first
      expect(flow.to_area).to be_nil
    end
  end
end
