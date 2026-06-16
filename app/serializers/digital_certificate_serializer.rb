class DigitalCertificateSerializer < Blueprinter::Base
  identifier :id

  fields :alias_name, :issued_to, :serial_number,
         :subject_dn, :issuer_dn, :valid_from, :valid_until,
         :is_default, :created_at

  field :status do |cert|
    cert.status.to_s
  end

  field :expired do |cert|
    cert.expired?
  end

  field :expires_soon do |cert|
    cert.expires_soon?
  end

  field :has_file do |cert|
    cert.certificate_file.attached?
  end

  field :file_name do |cert|
    cert.certificate_file.attached? ? cert.certificate_file.filename.to_s : nil
  end
end
