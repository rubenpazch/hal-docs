module Api
  module V1
    class DocumentTypesController < ApplicationController
      def index
        authorize DocumentType
        @document_types = DocumentType.active.order(:name)
      end

      def show
        @document_type = DocumentType.find(params[:id])
        authorize @document_type
      end

      def create
        authorize DocumentType
        @document_type = DocumentType.new(document_type_params)
        if @document_type.save
          render :show, status: :created
        else
          render json: { message: "Error al crear", errors: @document_type.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def update
        @document_type = DocumentType.find(params[:id])
        authorize @document_type
        if @document_type.update(document_type_params)
          render :show
        else
          render json: { message: "Error al actualizar", errors: @document_type.errors.full_messages },
                 status: :unprocessable_entity
        end
      end

      def destroy
        type = DocumentType.find(params[:id])
        authorize type
        type.update!(is_active: false)
        render json: { message: "Tipo de documento desactivado" }
      end

      private

      def document_type_params
        params.require(:document_type).permit(:name, :code, :description, :is_active)
      end
    end
  end
end
