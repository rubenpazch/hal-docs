FactoryBot.define do
  factory :document do
    subject { Faker::Lorem.sentence }
    sender { Faker::Name.name }
    recipient { Faker::Name.name }
    priority { :media }
    status { :registrado }
    direction { :entrada }
    access_level { :publico }
    folio_count { 1 }

    association :document_type
    association :area
    association :created_by, factory: :user

    trait :urgente do
      priority { :urgente }
    end

    trait :archivado do
      status { :archivado }
    end
  end
end
