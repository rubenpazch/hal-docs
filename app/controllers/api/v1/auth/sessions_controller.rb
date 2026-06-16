module Api
  module V1
    module Auth
      class SessionsController < Devise::SessionsController
        respond_to :json

        private

        def respond_with(resource, _opts = {})
          @message   = "Inicio de sesión exitoso"
          @auth_user = User.includes(:area, area_memberships: :area).find(resource.id)
          render "api/v1/auth/sessions/create", status: :ok
        end

        def respond_to_on_destroy
          if request.headers["Authorization"].present?
            jwt_payload = JWT.decode(
              request.headers["Authorization"].split(" ").last,
              Rails.application.credentials.secret_key_base
            ).first

            current_user = User.find(jwt_payload["sub"])
          end

          if current_user
            render json: { message: "Sesión cerrada exitosamente" }, status: :ok
          else
            render json: { message: "No se pudo cerrar sesión" }, status: :unauthorized
          end
        end
      end
    end
  end
end
