module Documents
  # Handles the initial registration of an internal document.
  # Responsibility: persist the Document, attach files, and record the first
  # DocumentFlow entry. Returns a value object so the caller never raises.
  #
  # Usage:
  #   result = Documents::RegisterService.call(
  #     params:       document_params,
  #     performed_by: current_user,
  #     attachments:  params[:attachments]
  #   )
  #   result.success?   # => true / false
  #   result.document   # => Document instance (persisted or with errors)
  #   result.errors     # => [] or ["Subject can't be blank", ...]
  class RegisterService
    DOCUMENT_INCLUDES = [
      :document_type, :area, :created_by,
      document_flows: [:performed_by, :from_area, :to_area]
    ].freeze

    Result = Struct.new(:success, :document, :errors, keyword_init: true) do
      def success? = success
    end

    def self.call(params:, performed_by:, attachments: nil)
      new(params: params, performed_by: performed_by, attachments: attachments).call
    end

    def initialize(params:, performed_by:, attachments: nil)
      @params       = params
      @performed_by = performed_by
      @attachments  = attachments
    end

    def call
      document = Document.new(@params)
      document.created_by = @performed_by

      unless document.save
        return Result.new(success: false, document: document, errors: document.errors.full_messages)
      end

      attach_files(document) if @attachments.present?

      DocumentFlow.create!(
        document:     document,
        performed_by: @performed_by,
        action:       "registrado",
        from_status:  nil,
        to_status:    "registrado",
        to_area:      document.area
      )

      Result.new(success: true, document: reload(document), errors: [])
    end

    private

    def attach_files(document)
      Array(@attachments).each { |file| document.attachments.attach(file) }
    end

    def reload(document)
      Document.includes(*DOCUMENT_INCLUDES).find(document.id)
    end
  end
end
