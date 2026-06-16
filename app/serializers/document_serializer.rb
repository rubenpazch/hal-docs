class DocumentSerializer < Blueprinter::Base
  identifier :id

  fields :subject, :sender, :recipient, :priority, :status,
         :observations, :document_number, :received_at, :due_date,
         :created_at, :updated_at,
         :folio_count, :reference_number, :requires_response, :author_initials,
         :direction, :access_level, :outside_hours, :attachment_checksum

  association :document_type, blueprint: DocumentTypeSerializer
  association :area, blueprint: AreaSerializer
  association :created_by, blueprint: UserSerializer

  association :document_flows, blueprint: DocumentFlowSerializer

  field :attachments_urls do |document|
    document.attachments.map do |attachment|
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
