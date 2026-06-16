json.extract! document, :id, :subject, :sender, :recipient, :priority, :status,
                         :observations, :document_number, :received_at, :due_date,
                         :folio_count, :reference_number, :requires_response, :author_initials,
                         :direction, :access_level, :outside_hours, :attachment_checksum,
                         :created_at, :updated_at

json.document_type do
  json.extract! document.document_type, :id, :name, :code, :description
end

if document.area
  json.area do
    json.extract! document.area, :id, :name
  end
else
  json.area nil
end

json.created_by do
  json.extract! document.created_by, :id, :nombre, :apellido, :email
  json.full_name document.created_by.full_name
end

# Use the already-loaded association and sort in memory to avoid N+1
json.document_flows document.document_flows.sort_by(&:performed_at) do |flow|
  json.extract! flow, :id, :action, :from_status, :to_status, :observations, :performed_at, :created_at

  json.performed_by do
    json.extract! flow.performed_by, :id, :nombre, :apellido
    json.full_name flow.performed_by.full_name
  end

  if flow.from_area
    json.from_area do
      json.extract! flow.from_area, :id, :name
    end
  else
    json.from_area nil
  end

  if flow.to_area
    json.to_area do
      json.extract! flow.to_area, :id, :name
    end
  else
    json.to_area nil
  end
end

json.attachments_urls document.attachments.map { |a|
  {
    id: a.id,
    filename: a.filename.to_s,
    content_type: a.content_type,
    byte_size: a.byte_size,
    url: Rails.application.routes.url_helpers.rails_blob_url(a, only_path: true)
  }
}
