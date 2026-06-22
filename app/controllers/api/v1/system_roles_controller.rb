module Api
  module V1
    class SystemRolesController < AuthenticatedController
      def index
        authorize :system_role, :index?
        @roles = SystemRole.order(:created_at)
      end

      def create
        authorize :system_role, :create?
        @role = SystemRole.new(role_params)
        if @role.save
          # Auto-create page permissions for the new role — all hidden by default
          RolePermission::PAGE_KEYS.each do |key|
            RolePermission.find_or_create_by!(role: @role.name, page_key: key) do |rp|
              rp.allowed = false
            end
          end
          render :show, status: :created
        else
          render json: { errors: @role.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        authorize :system_role, :update?
        @role = SystemRole.find(params[:id])
        if @role.update(update_params)
          render :show
        else
          render json: { errors: @role.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize :system_role, :destroy?
        @role = SystemRole.find(params[:id])
        if @role.destroy
          render json: { message: "Rol eliminado correctamente" }
        else
          render json: { errors: @role.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def role_params
        params.require(:system_role).permit(:name, :display_name, :color, :bg_color)
      end

      def update_params
        # name cannot be changed for system roles (enforced in model too)
        params.require(:system_role).permit(:display_name, :color, :bg_color)
      end
    end
  end
end
