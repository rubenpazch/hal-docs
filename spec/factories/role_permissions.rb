FactoryBot.define do
  factory :role_permission do
    role { "admin" }
    page_key { "dashboard" }
    allowed { true }
  end
end
