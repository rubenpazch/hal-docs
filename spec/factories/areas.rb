FactoryBot.define do
  factory :area do
    sequence(:name) { |n| "Area #{n}" }
    description { "Descripción del área" }
    area_type { :departamento }
    parent { nil }
    is_default { false }

    trait :default do
      name { "Mesa de Partes" }
      is_default { true }
    end
  end
end
