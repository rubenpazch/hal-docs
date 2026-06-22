module Documents
  # Executes a single status transition for an internal document.
  # Responsibilities:
  #   1. Validate the transition is allowed by TransitionRules.
  #   2. Validate any extra requirements (e.g. to_area_id for "derivado").
  #   3. Update the Document's status (and area when routing to another area).
  #   4. Create the corresponding DocumentFlow record.
  #
  # Usage:
  #   result = Documents::TransitionService.call(
  #     document:     @document,
  #     to_status:    "derivado",
  #     performed_by: current_user,
  #     to_area_id:   params[:to_area_id],
  #     observations: params[:observations]
  #   )
  #   result.success?   # => true / false
  #   result.document   # => reloaded Document on success, original on failure
  #   result.errors     # => []  or  ["Transición no permitida ...", ...]
  class TransitionService
    DOCUMENT_INCLUDES = [
      :document_type, :area, :created_by,
      document_flows: [:performed_by, :from_area, :to_area]
    ].freeze

    Result = Struct.new(:success, :document, :errors, keyword_init: true) do
      def success? = success
    end

    def self.call(document:, to_status:, performed_by:, observations: nil, to_area_id: nil)
      new(
        document:     document,
        to_status:    to_status,
        performed_by: performed_by,
        observations: observations,
        to_area_id:   to_area_id
      ).call
    end

    def initialize(document:, to_status:, performed_by:, observations: nil, to_area_id: nil)
      @document     = document
      @to_status    = to_status.to_s
      @performed_by = performed_by
      @observations = observations
      @to_area_id   = to_area_id.presence&.to_i
    end

    def call
      return failure("Transición no permitida de '#{@document.status}' a '#{@to_status}'") unless valid_transition?
      return failure("Debe especificar el área destinataria para derivar el documento") if area_required_but_missing?

      from_status = @document.status.to_s
      from_area   = @document.area

      update_attrs = { status: @to_status }
      update_attrs[:area_id] = @to_area_id if routing_to_new_area?

      unless @document.update(update_attrs)
        return Result.new(success: false, document: @document, errors: @document.errors.full_messages)
      end

      DocumentFlow.create!(
        document:     @document,
        performed_by: @performed_by,
        action:       TransitionRules.action_for(from: from_status, to: @to_status),
        from_status:  from_status,
        to_status:    @to_status,
        from_area:    from_area,
        to_area:      destination_area,
        observations: @observations
      )

      Result.new(success: true, document: reload(@document), errors: [])
    end

    private

    def valid_transition?
      TransitionRules.valid?(from: @document.status, to: @to_status)
    end

    def area_required_but_missing?
      TransitionRules.requires_area?(to: @to_status) && @to_area_id.blank?
    end

    def routing_to_new_area?
      @to_area_id.present?
    end

    def destination_area
      return nil unless @to_area_id.present?
      Area.find(@to_area_id)
    end

    def failure(message)
      Result.new(success: false, document: @document, errors: [message])
    end

    def reload(document)
      Document.includes(*DOCUMENT_INCLUDES).find(document.id)
    end
  end
end
