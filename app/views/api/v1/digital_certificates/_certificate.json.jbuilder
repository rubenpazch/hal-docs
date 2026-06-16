json.extract! cert, :id, :alias_name, :issued_to, :serial_number,
                    :subject_dn, :issuer_dn, :valid_from, :valid_until,
                    :is_default, :created_at

json.status       cert.status.to_s
json.expired      cert.expired?
json.expires_soon cert.expires_soon?
json.has_file     cert.certificate_file.attached?
json.file_name    cert.certificate_file.attached? ? cert.certificate_file.filename.to_s : nil
