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
          jwt_token = request.headers["Authorization"]&.split(" ")&.last

          if jwt_token.present?
            jwt_secret = ENV.fetch("DEVISE_JWT_SECRET_KEY", Rails.application.credentials.secret_key_base)
            jwt_payload = begin
              JWT.decode(jwt_token, jwt_secret, true, algorithms: ["HS256"]).first
            rescue JWT::DecodeError
              nil
            end

            current_user = jwt_payload ? User.find_by(id: jwt_payload["sub"]) : nil
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
