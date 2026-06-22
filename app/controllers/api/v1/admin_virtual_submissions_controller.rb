module Api
  module V1
    # Admin/staff controller — requires authentication.
    # Inherits from AuthenticatedController: JWT required + Pundit enforced.
    class AdminVirtualSubmissionsController < AuthenticatedController
      SUBMISSION_INCLUDES = [
        :document_type, :to_area,
        flows: [:from_area, :to_area, :performed_by]
      ].freeze

      def index
        authorize VirtualSubmission
        scope = submission_base_scope.order(created_at: :desc)

        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where(submitter_type: params[:submitter_type]) if params[:submitter_type].present?

        if params[:q].present?
          q = "%#{params[:q]}%"
          scope = scope.where(
            "tracking_number ILIKE :q OR submitter_name ILIKE :q OR submitter_document ILIKE :q OR subject ILIKE :q",
            q: q
          )
        end

        @pagy, @submissions = pagy(scope, limit: params[:per_page] || 20)
      end

      def show
        @submission = submission_base_scope.find(params[:id])
        authorize @submission
      end

      def bandeja
        authorize VirtualSubmission, :bandeja?
        area_id = current_user.area_id

        unless area_id
          return render json: {
            submissions: [],
            meta: { total: 0, per_page: 20, current_page: 1, total_pages: 0, from: 0, to: 0 }
          }
        end

        scope = submission_base_scope
                                 .where(to_area_id: area_id)
                                 .order(created_at: :desc)

        scope = scope.where(status: params[:status]) if params[:status].present?

        if params[:q].present?
          q = "%#{params[:q]}%"
          scope = scope.where(
            "tracking_number ILIKE :q OR submitter_name ILIKE :q OR subject ILIKE :q",
            q: q
          )
        end

        @pagy, @submissions = pagy(scope, limit: params[:per_page] || 20)
        render :index
      end

      def update_status
        @submission = submission_base_scope.find(params[:id])
        authorize @submission
        from_status  = @submission.status
        from_area_id = @submission.to_area_id
        new_status   = params[:status]

        attrs = { status: new_status, review_notes: params[:review_notes] }

        if new_status == "derivado"
          unless params[:to_area_id].present?
            return render json: { error: "Debe seleccionar el área destinataria para derivar el trámite" },
                          status: :unprocessable_entity
          end
          attrs[:to_area_id] = params[:to_area_id]
        end

        if @submission.update(attrs)
          @submission.flows.create!(
            action:       new_status,
            from_status:  from_status.to_s,
            to_status:    new_status,
            from_area_id: from_area_id,
            to_area_id:   new_status == "derivado" ? params[:to_area_id].to_i : nil,
            performed_by: current_user,
            notes:        params[:review_notes],
            performed_at: Time.current
          )

          if params[:attachments].present?
            VirtualSubmissions::AttachmentService.call(
              submission: @submission,
              files:      params[:attachments]
            )
          end

          @submission = submission_base_scope.find(@submission.id)
          render :show
        else
          render json: { errors: @submission.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      # Builds the base query with all associations + attachments eagerly loaded.
      # Active Storage selects the backend per environment:
      #   development → Disk (storage/)   production → Amazon S3
      def submission_base_scope
        VirtualSubmission.includes(*SUBMISSION_INCLUDES).with_attached_attachments
      end
    end
  end
end
