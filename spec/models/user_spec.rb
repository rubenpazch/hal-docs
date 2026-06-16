require "rails_helper"

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  # Associations
  it { is_expected.to belong_to(:area).optional }
  it { is_expected.to have_many(:area_memberships).dependent(:destroy) }
  it { is_expected.to have_many(:areas).through(:area_memberships) }

  # Validations
  it { is_expected.to validate_presence_of(:nombre) }
  it { is_expected.to validate_presence_of(:apellido) }
  it { is_expected.to validate_presence_of(:dni) }
  it { is_expected.to validate_uniqueness_of(:dni).case_insensitive }
  it { is_expected.to validate_length_of(:dni).is_equal_to(8) }
  it { is_expected.to validate_presence_of(:email) }

  # Enum
  it { is_expected.to define_enum_for(:role).with_values(admin: 0, manager: 1, staff: 2) }

  describe "#full_name" do
    it "concatenates nombre and apellido" do
      user.nombre   = "Juan"
      user.apellido = "Pérez"
      expect(user.full_name).to eq("Juan Pérez")
    end
  end

  describe "#primary_position" do
    it "returns nil when user has no area memberships" do
      user.save!
      expect(user.primary_position).to be_nil
    end

    it "returns the position_role of the active membership in the user's primary area" do
      area = create(:area)
      user.area = area
      user.save!
      create(:area_membership, user: user, area: area, position_role: :jefe, is_active: true)
      expect(user.primary_position).to eq("jefe")
    end
  end

  describe "soft delete" do
    it "is active by default" do
      user.save!
      expect(User.kept).to include(user)
    end

    it "is excluded from kept scope after discard" do
      user.save!
      user.discard
      expect(User.kept).not_to include(user)
    end
  end
end
