require "rails_helper"

RSpec.describe AreaMembership, type: :model do
  subject(:membership) { build(:area_membership) }

  # Associations
  it { is_expected.to belong_to(:user) }
  it { is_expected.to belong_to(:area) }

  # Validations
  it "prevents same user from joining the same area twice" do
    user = create(:user)
    area = create(:area)
    create(:area_membership, user: user, area: area)
    duplicate = build(:area_membership, user: user, area: area)
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:user_id]).to be_present
  end

  # Enum
  it { is_expected.to define_enum_for(:position_role).with_values(jefe: 0, coordinador: 1, operador_linea: 2, soporte: 3) }

  describe ".active scope" do
    it "returns only active memberships" do
      active   = create(:area_membership, is_active: true)
      inactive = create(:area_membership, user: create(:user), area: create(:area), is_active: false)

      expect(AreaMembership.active).to include(active)
      expect(AreaMembership.active).not_to include(inactive)
    end
  end
end
