require "rails_helper"

RSpec.describe RolePermission, type: :model do
  subject(:rp) { build(:role_permission) }

  # Validations
  it { is_expected.to validate_presence_of(:role) }
  it { is_expected.to validate_presence_of(:page_key) }
  it { is_expected.to validate_inclusion_of(:role).in_array(RolePermission::ROLES) }
  it { is_expected.to validate_inclusion_of(:page_key).in_array(RolePermission::PAGE_KEYS) }

  describe ".ensure_defaults!" do
    it "creates all page_key entries for a role when none exist" do
      RolePermission.where(role: "admin").delete_all
      expect { RolePermission.ensure_defaults!("admin") }
        .to change { RolePermission.where(role: "admin").count }
        .from(0).to(RolePermission::PAGE_KEYS.size)
    end

    it "is idempotent" do
      RolePermission.ensure_defaults!("staff")
      expect { RolePermission.ensure_defaults!("staff") }
        .not_to change { RolePermission.where(role: "staff").count }
    end
  end

  describe ".map_for" do
    it "returns a hash of page_key => allowed for the given role" do
      RolePermission.ensure_defaults!("admin")
      result = RolePermission.map_for("admin")
      expect(result).to be_a(Hash)
      expect(result.keys).to match_array(RolePermission::PAGE_KEYS)
    end
  end
end
