module Api
  module V1
    # Public controller — no authentication required
    class VirtualSubmissionsController < ApplicationController
      include Pagy::Backend
      skip_before_action :authenticate_user!
      skip_after_action  :verify_authorized

      rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found

      # GET /api/v1/mesa_virtual/document_types
      def document_types
        @document_types = DocumentType.active.order(:name)
      end

      # POST /api/v1/mesa_virtual/submit
      def create
        @submission = VirtualSubmission.new(submission_params)

        if @submission.save
          attach_files(@submission) if params[:attachments].present?

          @submission.flows.create!(
            action:       "registrado",
            from_status:  nil,
            to_status:    "registrado",
            notes:        nil,
            performed_at: @submission.received_at
          )

          render :show, status: :created
        else
          render json: {
            message: "No se pudo registrar el trámite",
            errors:  @submission.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/mesa_virtual/track
      def track
        @submissions = if params[:tracking_number].present?
          VirtualSubmission.includes(:document_type, :to_area, flows: [:from_area, :to_area])
                           .where(tracking_number: params[:tracking_number])
        elsif params[:document].present?
          VirtualSubmission.includes(:document_type, :to_area, flows: [:from_area, :to_area])
                           .where(submitter_document: params[:document])
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

      def attach_files(submission)
        files = params[:attachments].is_a?(Array) ? params[:attachments] : [params[:attachments]]
        files.each { |f| submission.attachments.attach(f) if f.respond_to?(:read) }
      end

      def handle_not_found
        render json: { error: "Recurso no encontrado" }, status: :not_found
      end
    end
  end
end
