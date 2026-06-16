FactoryBot.define do
  factory :virtual_submission do
    submitter_type { "natural" }
    submitter_name { Faker::Name.name }
    sequence(:submitter_document) { |n| "4560#{n.to_s.rjust(4, '0')}" }
    submitter_email { Faker::Internet.email }
    submitter_phone { "987654321" }
    submitter_address { Faker::Address.street_address }
    subject { Faker::Lorem.sentence }
    folio_count { 1 }
    status { :registrado }

    association :document_type
    to_area { nil }

    trait :juridica do
      submitter_type { "juridica" }
      company_name { Faker::Company.name }
      representative_name { Faker::Name.name }
    end
  end
end
