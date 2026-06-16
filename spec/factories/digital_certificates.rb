FactoryBot.define do
  factory :digital_certificate do
    alias_name  { "Certificado #{Faker::Lorem.word}" }
    issued_to   { Faker::Name.name }
    serial_number { SecureRandom.hex(8).upcase }
    subject_dn  { "/CN=#{Faker::Name.name}/O=Test Org/C=PE" }
    issuer_dn   { "/CN=Test CA/O=Test Org/C=PE" }
    valid_from  { 1.year.ago }
    valid_until { 1.year.from_now }
    is_default  { false }

    association :user
  end
end
