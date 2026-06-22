require "rails_helper"

RSpec.describe Documents::TransitionService do
  let(:area)         { create(:area) }
  let(:other_area)   { create(:area) }
  let(:user)         { create(:user) }
  let(:doc_type)     { create(:document_type) }
  let(:document) do
    create(:document, status: :registrado, area: area,
           document_type: doc_type, created_by: user)
  end

  # Helper: make the document sit in a given status without going through the service
  def force_status(doc, status)
    doc.update_column(:status, Document.statuses[status])
    doc.reload
  end

  # ------------------------------------------------------------------ success paths

  describe ".call — valid transition: registrado → en_proceso" do
    subject(:result) do
      described_class.call(document: document, to_status: "en_proceso", performed_by: user)
    end

    it { is_expected.to be_success }
    it { expect(result.errors).to be_empty }

    it "updates the document status" do
      expect(result.document.status).to eq("en_proceso")
    end

    it "creates a DocumentFlow with action 'avance'" do
      expect { result }.to change(DocumentFlow, :count).by(1)
      flow = result.document.document_flows.last
      expect(flow.action).to eq("avance")
      expect(flow.from_status).to eq("registrado")
      expect(flow.to_status).to eq("en_proceso")
      expect(flow.performed_by).to eq(user)
    end

    it "records from_area in the flow" do
      flow = result.document.document_flows.last
      expect(flow.from_area).to eq(area)
    end
  end

  describe ".call — derivado transition routes document to new area" do
    subject(:result) do
      described_class.call(
        document:     document,
        to_status:    "derivado",
        performed_by: user,
        to_area_id:   other_area.id
      )
    end

    it { is_expected.to be_success }

    it "updates the document area to the destination area" do
      expect(result.document.area).to eq(other_area)
    end

    it "creates a DocumentFlow with action 'derivado' and correct areas" do
      flow = result.document.document_flows.last
      expect(flow.action).to eq("derivado")
      expect(flow.from_area).to eq(area)
      expect(flow.to_area).to eq(other_area)
    end
  end

  describe ".call — with observations" do
    subject(:result) do
      described_class.call(
        document:     document,
        to_status:    "en_proceso",
        performed_by: user,
        observations: "Nota de avance"
      )
    end

    it "stores the observations on the flow record" do
      flow = result.document.document_flows.last
      expect(flow.observations).to eq("Nota de avance")
    end
  end

  describe ".call — anulado from any active status" do
    %w[registrado en_proceso derivado respondido devuelto].each do |from|
      it "allows anulado from #{from}" do
        force_status(document, from)
        result = described_class.call(document: document, to_status: "anulado", performed_by: user)
        expect(result).to be_success
        expect(result.document.status).to eq("anulado")
      end
    end
  end

  # ------------------------------------------------------------------ failure paths

  describe ".call — invalid transition" do
    subject(:result) do
      described_class.call(document: document, to_status: "finalizado", performed_by: user)
    end

    it { is_expected.not_to be_success }

    it "returns a descriptive error" do
      expect(result.errors.first).to match(/Transición no permitida/)
    end

    it "does not change the document status" do
      expect { result }.not_to change { document.reload.status }
    end

    it "does not create a DocumentFlow" do
      expect { result }.not_to change(DocumentFlow, :count)
    end
  end

  describe ".call — derivado without to_area_id" do
    subject(:result) do
      described_class.call(document: document, to_status: "derivado", performed_by: user)
    end

    it { is_expected.not_to be_success }

    it "returns an area-required error" do
      expect(result.errors.first).to match(/área destinataria/)
    end

    it "does not create a DocumentFlow" do
      expect { result }.not_to change(DocumentFlow, :count)
    end
  end

  describe ".call — transition from a terminal state" do
    it "does not allow any transition out of finalizado" do
      force_status(document, "finalizado")
      result = described_class.call(document: document, to_status: "en_proceso", performed_by: user)
      expect(result).not_to be_success
    end

    it "does not allow any transition out of archivado" do
      force_status(document, "archivado")
      result = described_class.call(document: document, to_status: "en_proceso", performed_by: user)
      expect(result).not_to be_success
    end

    it "does not allow re-anulado on an already anulado document" do
      force_status(document, "anulado")
      result = described_class.call(document: document, to_status: "anulado", performed_by: user)
      expect(result).not_to be_success
    end
  end

  # ------------------------------------------------------------------ return value

  describe "the returned document on success" do
    it "is reloaded with all associations eagerly loaded" do
      result = described_class.call(document: document, to_status: "en_proceso", performed_by: user)
      doc = result.document
      expect(doc.document_type).not_to be_nil
      expect(doc.area).not_to be_nil
      expect(doc.document_flows).not_to be_empty
    end
  end
end
