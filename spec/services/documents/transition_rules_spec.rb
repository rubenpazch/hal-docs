require "rails_helper"

RSpec.describe Documents::TransitionRules do
  describe ".valid?" do
    context "when the transition is allowed" do
      it { expect(described_class.valid?(from: "registrado",  to: "en_proceso")).to be true }
      it { expect(described_class.valid?(from: "registrado",  to: "derivado")).to be true }
      it { expect(described_class.valid?(from: "registrado",  to: "anulado")).to be true }
      it { expect(described_class.valid?(from: "en_proceso",  to: "derivado")).to be true }
      it { expect(described_class.valid?(from: "en_proceso",  to: "respondido")).to be true }
      it { expect(described_class.valid?(from: "en_proceso",  to: "devuelto")).to be true }
      it { expect(described_class.valid?(from: "en_proceso",  to: "finalizado")).to be true }
      it { expect(described_class.valid?(from: "en_proceso",  to: "anulado")).to be true }
      it { expect(described_class.valid?(from: "derivado",    to: "en_proceso")).to be true }
      it { expect(described_class.valid?(from: "derivado",    to: "devuelto")).to be true }
      it { expect(described_class.valid?(from: "derivado",    to: "finalizado")).to be true }
      it { expect(described_class.valid?(from: "derivado",    to: "anulado")).to be true }
      it { expect(described_class.valid?(from: "respondido",  to: "finalizado")).to be true }
      it { expect(described_class.valid?(from: "respondido",  to: "archivado")).to be true }
      it { expect(described_class.valid?(from: "respondido",  to: "anulado")).to be true }
      it { expect(described_class.valid?(from: "devuelto",    to: "en_proceso")).to be true }
      it { expect(described_class.valid?(from: "devuelto",    to: "anulado")).to be true }
    end

    context "when the transition is not allowed" do
      it "blocks forward-skip from registrado to finalizado" do
        expect(described_class.valid?(from: "registrado", to: "finalizado")).to be false
      end

      it "blocks re-opening a finalizado document" do
        expect(described_class.valid?(from: "finalizado", to: "en_proceso")).to be false
      end

      it "blocks re-opening an archivado document" do
        expect(described_class.valid?(from: "archivado", to: "en_proceso")).to be false
      end

      it "blocks re-activating an already-anulado document" do
        expect(described_class.valid?(from: "anulado", to: "registrado")).to be false
      end

      it "returns false for completely unknown statuses" do
        expect(described_class.valid?(from: "inventado", to: "en_proceso")).to be false
      end
    end

    it "accepts symbol arguments as well as strings" do
      expect(described_class.valid?(from: :registrado, to: :en_proceso)).to be true
    end
  end

  describe ".action_for" do
    it "returns the correct flow action for a known transition" do
      expect(described_class.action_for(from: "registrado", to: "en_proceso")).to eq("avance")
      expect(described_class.action_for(from: "en_proceso", to: "derivado")).to eq("derivado")
      expect(described_class.action_for(from: "en_proceso", to: "devuelto")).to eq("devuelto")
      expect(described_class.action_for(from: "en_proceso", to: "finalizado")).to eq("finalizado")
      expect(described_class.action_for(from: "registrado", to: "anulado")).to eq("anulado")
    end

    it "returns nil for an unknown transition pair" do
      expect(described_class.action_for(from: "archivado", to: "en_proceso")).to be_nil
    end
  end

  describe ".requires_area?" do
    it "returns true only for derivado" do
      expect(described_class.requires_area?(to: "derivado")).to be true
    end

    it "returns false for other statuses" do
      %w[en_proceso finalizado anulado devuelto archivado respondido].each do |status|
        expect(described_class.requires_area?(to: status)).to be false
      end
    end
  end

  describe ".allowed_from" do
    it "returns all valid next statuses from registrado" do
      expect(described_class.allowed_from("registrado")).to match_array(%w[en_proceso derivado anulado])
    end

    it "returns an empty array for terminal states" do
      expect(described_class.allowed_from("finalizado")).to be_empty
      expect(described_class.allowed_from("archivado")).to be_empty
      expect(described_class.allowed_from("anulado")).to be_empty
    end

    it "returns an empty array for unknown status" do
      expect(described_class.allowed_from("inexistente")).to be_empty
    end
  end
end
