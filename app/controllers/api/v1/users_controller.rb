module Api
  module V1
    class UsersController < AuthenticatedController
      before_action :set_user, only: [:show, :update, :destroy, :restore, :update_role]

      def index
        authorize User
        @users = User.kept.includes(:area, area_memberships: :area)
        @users = @users.ransack(params[:q]).result if params[:q]
      end

      def show
        authorize @user
      end

      def create
        authorize User
        @user = User.new(user_params)
        @user.password = params[:user][:password]
        @user.password_confirmation = params[:user][:password_confirmation]

        if @user.save
          assign_area_membership(@user) if params[:user][:area_id].present?
          @user = User.includes(:area, area_memberships: :area).find(@user.id)
          render :show, status: :created
        else
          render json: {
            message: "No se pudo crear el usuario",
            errors:  @user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def update
        authorize @user
        if @user.update(update_user_params)
          assign_area_membership(@user) if params[:user][:area_id].present?
          @user = User.includes(:area, area_memberships: :area).find(@user.id)
          render :show
        else
          render json: {
            message: "No se pudo actualizar el usuario",
            errors:  @user.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize @user
        @user.discard
        render json: { message: "Usuario desactivado exitosamente" }
      end

      def restore
        authorize @user
        @user.undiscard
        render json: { message: "Usuario reactivado exitosamente" }
      end

      def update_role
        authorize @user, :update?
        if @user.update(role: params[:role])
          render :show
        else
          render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def set_user
        @user = User.includes(:area, area_memberships: :area).find(params[:id])
      end

      def user_params
        params.require(:user).permit(
          :email, :nombre, :apellido, :dni, :telefono,
          :role, :area_id, :password, :password_confirmation
        )
      end

      def update_user_params
        permitted = params.require(:user).permit(
          :email, :nombre, :apellido, :dni, :telefono, :role, :area_id,
          :password, :password_confirmation
        ).to_h

        permitted.delete("password")             if permitted["password"].blank?
        permitted.delete("password_confirmation") if permitted["password_confirmation"].blank?
        permitted.delete("position_role")
        permitted
      end

      def assign_area_membership(user)
        return unless params[:user][:area_id].present?

        membership = user.area_memberships.find_or_initialize_by(area_id: params[:user][:area_id])
        membership.position_role = params[:user][:position_role].presence || membership.position_role || "soporte"
        membership.is_active = true
        membership.save!
      end
    end
  end
end
