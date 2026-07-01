module Api
  module V1
    class ArchivosController < AuthenticatedController
      before_action :set_archivo, only: [:show, :destroy, :sign]

      ARCHIVO_INCLUDES = [:uploader, :document_type, :file_attachment, :file_blob].freeze

      # GET /api/v1/archivos
      def index
        authorize Archivo
        scope = Archivo.includes(*ARCHIVO_INCLUDES).order(created_at: :desc)
        scope = scope.where(estado: params[:estado]) if params[:estado].present?
        scope = scope.where(document_type_id: params[:document_type_id]) if params[:document_type_id].present?
        if params[:q].present?
          q = "%#{params[:q]}%"
          scope = scope.joins(:document_type)
                       .where("archivos.nombre ILIKE :q OR document_types.name ILIKE :q", q: q)
        end

        @total_count  = scope.count
        per_page      = 20
        @current_page = [(params[:page] || 1).to_i, 1].max
        @total_pages  = [(@total_count.to_f / per_page).ceil, 1].max
        @archivos     = scope.limit(per_page).offset((@current_page - 1) * per_page)
      end

      # GET /api/v1/archivos/:id
      def show
        authorize @archivo
      end

      # POST /api/v1/archivos
      def create
        authorize Archivo
        @archivo = Archivo.new(archivo_params)
        @archivo.uploader = current_user
        if @archivo.save
          render :show, status: :created
        else
          render json: { errors: @archivo.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/archivos/:id
      def destroy
        authorize @archivo
        if @archivo.tramites_count > 0
          return render json: {
            error: "No se puede eliminar: el archivo está vinculado a #{@archivo.tramites_count} trámite(s)"
          }, status: :unprocessable_entity
        end
        @archivo.file.purge if @archivo.file.attached?
        @archivo.destroy!
        render json: { message: "Archivo eliminado" }
      end

      # POST /api/v1/archivos/:id/sign
      def sign
        authorize @archivo
        return render json: { error: "El archivo ya está firmado" }, status: :unprocessable_entity if @archivo.firmado?
        return render json: { error: "La contraseña del certificado es obligatoria" }, status: :unprocessable_entity if params[:password].blank?

        certificate = current_user.digital_certificates.kept.find_by(is_default: true)
        unless certificate&.certificate_file&.attached?
          return render json: { error: "No tienes un certificado digital activo configurado" },
                        status: :unprocessable_entity
        end

        unless @archivo.file.attached?
          return render json: { error: "El archivo no tiene un documento adjunto" },
                        status: :unprocessable_entity
        end

        file_data    = @archivo.file.download
        p12_data     = certificate.certificate_file.download
        pdf_input    = @archivo.file.content_type == "application/pdf"

        result = if pdf_input
          PadesSigningService.call(
            file_data:      file_data,
            p12_data:       p12_data,
            password:       params[:password],
            signature_page: params[:signature_page].presence&.to_i,
            signature_x:    params[:signature_x].presence&.to_f,
            signature_y:    params[:signature_y].presence&.to_f
          )
        else
          DocumentSigningService.call(
            file_data: file_data,
            p12_data:  p12_data,
            password:  params[:password]
          )
        end

        unless result.success?
          return render json: { error: "No se pudo firmar el archivo", detail: result.error },
                        status: :unprocessable_entity
        end

        original_name  = @archivo.file.filename.to_s
        base_name      = File.basename(original_name, ".*")
        signed_name    = pdf_input ? "#{base_name}[FIRMADO].pdf" : "#{base_name}[FIRMADO].p7s"
        signed_content = pdf_input ? "application/pdf" : "application/pkcs7-signature"

        @archivo.file.attach(
          io:           StringIO.new(result.signed_data),
          filename:     signed_name,
          content_type: signed_content
        )

        position_attrs = {}
        position_attrs[:signature_page] = params[:signature_page].to_i if params[:signature_page].present?
        position_attrs[:signature_x]    = params[:signature_x].to_f    if params[:signature_x].present?
        position_attrs[:signature_y]    = params[:signature_y].to_f    if params[:signature_y].present?

        @archivo.update!(estado: :firmado, firmado_at: Time.current, **position_attrs)
        render :show
      end

      private

      def set_archivo
        @archivo = Archivo.includes(*ARCHIVO_INCLUDES).find(params[:id])
      end

      def archivo_params
        params.require(:archivo).permit(:nombre, :document_type_id, :file)
      end
    end
  end
end
