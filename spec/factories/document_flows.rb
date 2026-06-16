FactoryBot.define do
  factory :document_flow do
    action { "registrado" }
    from_status { nil }
    to_status { "registrado" }
    performed_at { Time.current }

    association :document
    association :performed_by, factory: :user
    from_area { nil }
    to_area { nil }
  end
end
