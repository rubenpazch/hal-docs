module Api
  module V1
    class DocumentsController < AuthenticatedController
      before_action :set_document, only: [:show, :update, :destroy, :update_status, :validate_signature]

      DOCUMENT_INCLUDES = [
        :document_type, :area, :created_by,
        :archivos,
        document_flows: [:performed_by, :from_area, :to_area]
      ].freeze

      def index
        authorize Document
        scope = Document.includes(*DOCUMENT_INCLUDES).order(created_at: :desc)

        scope = scope.ransack(params[:q]).result if params[:q].present?
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where(priority: params[:priority]) if params[:priority].present?

        @pagy, @documents = pagy(scope, limit: params[:per_page] || 15)
      end

      def show
        authorize @document
      end

      def create
        authorize Document
        result = Documents::RegisterService.call(
          params:       document_params,
          performed_by: current_user,
          attachments:  params[:attachments].presence
        )

        if result.success?
          @document = result.document
          link_archivos(@document) if params[:archivo_ids].present?
          @document = Document.includes(*DOCUMENT_INCLUDES).find(@document.id)
          render :show, status: :created
        else
          render json: {
            message: "No se pudo registrar el documento",
            errors:  result.errors
          }, status: :unprocessable_entity
        end
      end

      def update
        authorize @document
        if @document.update(document_params)
          attach_files(@document) if params[:attachments].present?
          link_archivos(@document) if params[:archivo_ids].present?
          @document = Document.includes(*DOCUMENT_INCLUDES).find(@document.id)
          render :show
        else
          render json: {
            message: "No se pudo actualizar el documento",
            errors:  @document.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize @document
        result = Documents::TransitionService.call(
          document:     @document,
          to_status:    "anulado",
          performed_by: current_user
        )

        if result.success?
          render json: { message: "Documento anulado exitosamente" }
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def update_status
        authorize @document
        result = Documents::TransitionService.call(
          document:     @document,
          to_status:    params[:status],
          performed_by: current_user,
          observations: params[:observations],
          to_area_id:   params[:to_area_id]
        )

        if result.success?
          @document = result.document
          render :show
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def mine
        authorize Document
        scope = Document.includes(*DOCUMENT_INCLUDES)
                        .where(created_by: current_user)
                        .order(created_at: :desc)

        scope = scope.ransack(params[:q]).result if params[:q].present?
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where(priority: params[:priority]) if params[:priority].present?

        @pagy, @documents = pagy(scope, limit: params[:per_page] || 15)
        render :index
      end

      def search
        authorize Document
        @documents = Document.includes(*DOCUMENT_INCLUDES)
                              .ransack(params[:q]).result
                              .order(created_at: :desc)
                              .limit(20)
      end

      # POST /api/v1/documents/:id/validate_signature
      def validate_signature
        index      = (params[:attachment_index] || 0).to_i
        attachment = @document.attachments[index]

        unless attachment&.attached?
          return render json: { message: "El documento no tiene archivos adjuntos para validar" },
                        status: :unprocessable_entity
        end

        service = FirmaPeruService.new
        result  = service.validate(attachment: attachment)

        unless result.available?
          return render json: {
            message:   "Servicio FIRMA PERÚ no disponible",
            error:     result.error,
            available: false
          }, status: :service_unavailable
        end

        render json: {
          available:   true,
          valid:       result.valid?,
          result_text: result.result_text,
          signatures:  result.signatures,
          file:        attachment.filename.to_s
        }
      end

      private

      def set_document
        @document = Document.includes(*DOCUMENT_INCLUDES).find(params[:id])
      end

      def document_params
        params.require(:document).permit(
          :document_type_id, :area_id, :subject, :sender,
          :recipient, :priority, :observations, :due_date, :received_at,
          :folio_count, :reference_number, :requires_response,
          :author_initials, :direction, :access_level
        )
      end

      def attach_files(document)
        Array(params[:attachments]).each { |file| document.attachments.attach(file) }
      end

      def link_archivos(document)
        ids = Array(params[:archivo_ids]).map(&:to_i).uniq
        archivos = Archivo.where(id: ids)
        archivos.each do |archivo|
          document.document_archivos.find_or_create_by!(archivo: archivo)
        end
      end
    end
  end
end
