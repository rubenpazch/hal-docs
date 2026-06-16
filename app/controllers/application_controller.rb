class ApplicationController < ActionController::API
  include ActionView::Rendering  # required for jbuilder templates in API mode
  include Pagy::Backend
  include Pundit::Authorization

  before_action :authenticate_user!

  rescue_from Pundit::NotAuthorizedError, with: :handle_unauthorized
  rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found

  private

  def handle_unauthorized
    render json: { error: "No tienes permiso para realizar esta acción" }, status: :forbidden
  end

  def handle_not_found
    render json: { error: "Recurso no encontrado" }, status: :not_found
  end
end
