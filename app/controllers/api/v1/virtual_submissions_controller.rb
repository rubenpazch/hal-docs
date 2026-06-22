module Api
  module V1
    # Public controller — no authentication required.
    # Inherits from PublicController: no JWT, no Pundit.
    class VirtualSubmissionsController < PublicController

      # GET /api/v1/mesa_virtual/document_types
      def document_types
        @document_types = DocumentType.active.order(:name)
      end

      # POST /api/v1/mesa_virtual/submit
      def create
        @submission = VirtualSubmission.new(submission_params)

        unless @submission.save
          return render json: {
            message: "No se pudo registrar el trámite",
            errors:  @submission.errors.full_messages
          }, status: :unprocessable_entity
        end

        if params[:attachments].present?
          result = VirtualSubmissions::AttachmentService.call(
            submission: @submission,
            files:      params[:attachments]
          )

          unless result.success?
            @submission.destroy
            return render json: {
              message: "Error al adjuntar archivos",
              errors:  result.errors
            }, status: :unprocessable_entity
          end
        end

        @submission.flows.create!(
          action:       "registrado",
          from_status:  nil,
          to_status:    "registrado",
          notes:        nil,
          performed_at: @submission.received_at
        )

        render :show, status: :created
      end

      # GET /api/v1/mesa_virtual/track
      def track
        base = VirtualSubmission
                 .includes(:document_type, :to_area, flows: [:from_area, :to_area])
                 .with_attached_attachments

        @submissions = if params[:tracking_number].present?
          base.where(tracking_number: params[:tracking_number])
        elsif params[:document].present?
          base.where(submitter_document: params[:document])
        else
          return render json: { error: "Debe proporcionar número de trámite o número de documento" },
                        status: :bad_request
        end

        if @submissions.empty?
          return render json: { error: "No se encontraron trámites con los datos proporcionados" },
                        status: :not_found
        end

        @submissions = @submissions.order(created_at: :desc)
      end

      private

      def submission_params
        params.require(:submission).permit(
          :submitter_type, :submitter_name, :submitter_document,
          :submitter_email, :submitter_phone, :submitter_address,
          :company_name, :representative_name,
          :document_type_id, :subject, :observations, :folio_count
        )
      end

    end
  end
end
