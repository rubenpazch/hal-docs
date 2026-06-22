module Api
  module V1
    class RolePermissionsController < AuthenticatedController
      def my_permissions
        skip_authorization  # Returns current user's own permissions — no resource-level check needed
        role = current_user.role.to_s
        RolePermission.ensure_defaults!(role)
        @permissions = RolePermission.map_for(role)
      end

      def index
        authorize :role_permission, :index?

        roles = RolePermission.roles
        @permissions = {}
        @roles_meta  = SystemRole.order(:created_at)

        roles.each do |role|
          RolePermission.ensure_defaults!(role)
          @permissions[role] = RolePermission.map_for(role)
        end
      end

      def update_batch
        authorize :role_permission, :update?

        live_roles = RolePermission.roles
        updates = params.require(:permissions).permit(
          live_roles.index_with { RolePermission::PAGE_KEYS }
        ).to_h

        ActiveRecord::Base.transaction do
          updates.each do |role, pages|
            next unless live_roles.include?(role)
            pages.each do |page_key, allowed|
              next unless RolePermission::PAGE_KEYS.include?(page_key)
              RolePermission.find_or_initialize_by(role: role, page_key: page_key)
                            .update!(allowed: ActiveModel::Type::Boolean.new.cast(allowed))
            end
          end
        end

        render json: { message: "Permisos actualizados correctamente" }
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
