class VirtualSubmissionSerializer < Blueprinter::Base
  identifier :id

  fields :tracking_number, :submitter_type, :submitter_name, :submitter_document,
         :submitter_email, :submitter_phone, :submitter_address,
         :company_name, :representative_name,
         :subject, :observations, :folio_count,
         :status, :review_notes, :received_at,
         :created_at, :updated_at

  association :document_type, blueprint: DocumentTypeSerializer

  field :attachments_urls do |submission|
    submission.attachments.map do |attachment|
      {
        id: attachment.id,
        filename: attachment.filename.to_s,
        content_type: attachment.content_type,
        byte_size: attachment.byte_size,
        url: Rails.application.routes.url_helpers.rails_blob_url(attachment, only_path: true)
      }
    end
  end
end
