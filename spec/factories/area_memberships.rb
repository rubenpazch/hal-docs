FactoryBot.define do
  factory :area_membership do
    position_role { :soporte }
    is_active { true }

    association :user
    association :area
  end
end
