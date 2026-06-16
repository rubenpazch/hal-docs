require "rails_helper"

RSpec.describe Area, type: :model do
  subject(:area) { build(:area) }

  # Associations
  it { is_expected.to belong_to(:parent).class_name("Area").optional }
  it { is_expected.to have_many(:children).class_name("Area") }
  it { is_expected.to have_many(:area_memberships).dependent(:destroy) }
  it { is_expected.to have_many(:users).through(:area_memberships) }

  # Validations
  it { is_expected.to validate_presence_of(:name) }
  it { is_expected.to validate_uniqueness_of(:name).scoped_to(:parent_id) }

  # Enum
  it { is_expected.to define_enum_for(:area_type).with_values(gerencia: 0, departamento: 1, equipo: 2, unidad: 3) }

  describe "soft delete" do
    it "appears in kept scope when active" do
      area.save!
      expect(Area.kept).to include(area)
    end

    it "is excluded from kept scope after discard" do
      area.save!
      area.discard
      expect(Area.kept).not_to include(area)
    end
  end

  describe "hierarchy" do
    it "can be a child of another area" do
      parent = create(:area)
      child  = create(:area, parent: parent)
      expect(parent.children).to include(child)
    end

    it "root? is true when parent is nil" do
      expect(area.parent).to be_nil
    end
  end
end
