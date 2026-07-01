module Api
  module V1
    class DocumentBundlesController < AuthenticatedController
      before_action :set_bundle, only: [:show, :update, :destroy, :add_archivo, :remove_archivo]

      BUNDLE_INCLUDES = [
        :creator,
        { archivos: [:document_type, :file_attachment, :file_blob] }
      ].freeze

      # GET /api/v1/document_bundles
      def index
        authorize DocumentBundle
        @bundles = DocumentBundle.includes(*BUNDLE_INCLUDES).order(created_at: :desc)
      end

      # GET /api/v1/document_bundles/:id
      def show
        authorize @bundle
      end

      # POST /api/v1/document_bundles
      def create
        authorize DocumentBundle
        @bundle = DocumentBundle.new(bundle_params)
        @bundle.creator = current_user
        if @bundle.save
          render :show, status: :created
        else
          render json: { errors: @bundle.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/document_bundles/:id
      def update
        authorize @bundle
        if @bundle.update(bundle_params)
          render :show
        else
          render json: { errors: @bundle.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/document_bundles/:id
      def destroy
        authorize @bundle
        @bundle.destroy!
        render json: { message: "Grupo eliminado" }
      end

      # POST /api/v1/document_bundles/:id/add_archivo
      def add_archivo
        authorize @bundle, :manage_archivos?
        archivo = Archivo.find(params[:archivo_id])
        @bundle.bundle_archivos.find_or_create_by!(archivo: archivo) do |ba|
          ba.position = @bundle.bundle_archivos.count
        end
        render :show
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Archivo no encontrado" }, status: :not_found
      end

      # DELETE /api/v1/document_bundles/:id/remove_archivo
      def remove_archivo
        authorize @bundle, :manage_archivos?
        ba = @bundle.bundle_archivos.find_by(archivo_id: params[:archivo_id])
        if ba
          ba.destroy!
          render :show
        else
          render json: { error: "El archivo no está en este grupo" }, status: :not_found
        end
      end

      private

      def set_bundle
        @bundle = DocumentBundle.includes(*BUNDLE_INCLUDES).find(params[:id])
      end

      def bundle_params
        params.require(:document_bundle).permit(:name, :description)
      end
    end
  end
end
