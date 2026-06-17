class ApplicationController < ActionController::API
  include ActionView::Rendering  # required for jbuilder templates in API mode
  include Pagy::Backend
  include Pundit::Authorization

  before_action { request.format = :json }
  before_action :authenticate_user!, unless: :devise_controller?
  after_action  :verify_authorized, unless: :devise_controller?

  rescue_from Pundit::NotAuthorizedError,  with: :handle_unauthorized
  rescue_from ActiveRecord::RecordNotFound, with: :handle_not_found
  rescue_from Pundit::AuthorizationNotPerformedError, with: :handle_authorization_not_performed

  private

  def handle_unauthorized
    render json: { error: "No tienes permiso para realizar esta acción" }, status: :forbidden
  end

  def handle_not_found
    render json: { error: "Recurso no encontrado" }, status: :not_found
  end

  def handle_authorization_not_performed
    render json: { error: "Acción no autorizada" }, status: :forbidden
  end
end
