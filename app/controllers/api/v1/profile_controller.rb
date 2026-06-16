module Api
  module V1
    class ProfileController < ApplicationController
      # All actions operate on current_user — no separate policy lookup needed
      skip_after_action :verify_authorized

      def show
        @current_user_profile = User.includes(:area, area_memberships: :area).find(current_user.id)
      end

      def update
        if current_user.update(profile_params)
          @current_user_profile = User.includes(:area, area_memberships: :area).find(current_user.id)
          render :show
        else
          render json: {
            message: "No se pudo actualizar el perfil",
            errors:  current_user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def update_password
        unless current_user.valid_password?(params[:current_password])
          return render json: { error: "La contraseña actual es incorrecta" }, status: :unprocessable_entity
        end

        if current_user.update(password: params[:password], password_confirmation: params[:password_confirmation])
          render json: { message: "Contraseña actualizada exitosamente" }
        else
          render json: {
            message: "No se pudo actualizar la contraseña",
            errors:  current_user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      private

      def profile_params
        params.require(:user).permit(:nombre, :apellido, :telefono, :cargo)
      end
    end
  end
end
