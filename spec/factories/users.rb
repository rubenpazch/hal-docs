FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" }
    password_confirmation { "password123" }
    nombre { Faker::Name.first_name }
    apellido { Faker::Name.last_name }
    sequence(:dni) { |n| "1000#{n.to_s.rjust(4, '0')}" }
    telefono { "987654321" }
    role { "mesa_de_partes" }
    area { nil }

    trait :admin do
      role { "admin" }
    end

    trait :manager do
      role { "manager" }
    end

    trait :with_area do
      association :area
    end
  end
end
