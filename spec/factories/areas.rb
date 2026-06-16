FactoryBot.define do
  factory :area do
    sequence(:name) { |n| "Area #{n}" }
    description { "Descripción del área" }
    area_type { :departamento }
    parent { nil }
  end
end
