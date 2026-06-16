json.extract! submission, :id, :tracking_number, :submitter_type, :submitter_name,
                          :submitter_document, :submitter_email, :submitter_phone,
                          :submitter_address, :company_name, :representative_name,
                          :subject, :observations, :folio_count, :status,
                          :review_notes, :received_at, :created_at, :updated_at

json.document_type do
  json.extract! submission.document_type, :id, :name, :code
end

if submission.to_area
  json.to_area do
    json.extract! submission.to_area, :id, :name
  end
else
  json.to_area nil
end

json.attachments_urls submission.attachments.map { |a|
  {
    id: a.id,
    filename: a.filename.to_s,
    content_type: a.content_type,
    byte_size: a.byte_size,
    url: Rails.application.routes.url_helpers.rails_blob_url(a, only_path: true)
  }
}
