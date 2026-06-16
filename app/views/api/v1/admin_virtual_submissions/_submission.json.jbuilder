json.extract! submission, :id, :tracking_number, :submitter_type, :submitter_name,
                          :submitter_document, :submitter_email, :submitter_phone,
                          :company_name, :representative_name,
                          :subject, :observations, :folio_count, :status,
                          :review_notes, :received_at, :created_at

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

# Timeline sorted in memory from pre-loaded flows — no extra queries
json.timeline submission.flows.sort_by(&:performed_at) do |flow|
  json.date        flow.performed_at
  json.action      flow.action
  json.from_status flow.from_status
  json.status      flow.to_status
  json.notes       flow.notes
  json.performed_by flow.performed_by&.full_name

  json.from_area flow.from_area&.name
  json.area      flow.to_area&.name
end
