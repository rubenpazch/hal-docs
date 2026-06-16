require "rails_helper"

RSpec.describe Document, type: :model do
  subject(:document) { build(:document) }

  # Associations
  it { is_expected.to belong_to(:document_type) }
  it { is_expected.to belong_to(:area).optional }
  it { is_expected.to belong_to(:created_by).class_name("User") }
  it { is_expected.to have_many(:document_flows).dependent(:destroy) }

  # Validations
  it { is_expected.to validate_presence_of(:subject) }
  it { is_expected.to validate_presence_of(:sender) }
  it { is_expected.to validate_presence_of(:recipient) }
  it { is_expected.to validate_presence_of(:document_type) }

  # Enums
  it { is_expected.to define_enum_for(:priority).with_values(baja: 0, media: 1, alta: 2, urgente: 3) }
  it { is_expected.to define_enum_for(:status).with_values(registrado: 0, en_proceso: 1, derivado: 2, respondido: 3, archivado: 4, anulado: 5, devuelto: 6, finalizado: 7) }
  it { is_expected.to define_enum_for(:direction).with_values(entrada: 0, interno: 1, salida: 2) }
  it { is_expected.to define_enum_for(:access_level).with_values(publico: 0, interno_area: 1, reservado: 2, confidencial: 3) }

  describe "document_number auto-assignment" do
    it "generates a document_number on create" do
      doc = create(:document)
      expect(doc.document_number).to be_present
      expect(doc.document_number).to match(/\A\w+-\d{4}-\d+\z/)
    end

    it "does not overwrite an existing document_number" do
      doc = build(:document, document_number: "CUSTOM-2026-00001")
      doc.save!
      expect(doc.document_number).to eq("CUSTOM-2026-00001")
    end
  end

  describe "received_at auto-assignment" do
    it "sets received_at on create when not provided" do
      doc = create(:document)
      expect(doc.received_at).to be_present
    end
  end

  describe "defaults" do
    it "defaults priority to media" do
      expect(document.priority).to eq("media")
    end

    it "defaults status to registrado" do
      expect(document.status).to eq("registrado")
    end
  end
end
