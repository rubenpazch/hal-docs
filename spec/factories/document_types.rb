FactoryBot.define do
  factory :document_type do
    sequence(:name) { |n| "Tipo Documento #{n}" }
    sequence(:code) { |n| "TD#{n.to_s.rjust(3, '0')}" }
    description { "Descripción del tipo" }
    is_active { true }
  end
end
