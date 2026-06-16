module Api
  module V1
    class RolePermissionsController < ApplicationController
      def my_permissions
        role = current_user.role.to_s
        RolePermission.ensure_defaults!(role)
        @permissions = RolePermission.map_for(role)
      end

      def index
        authorize :role_permission, :index?

        @permissions = {}
        RolePermission::ROLES.each do |role|
          RolePermission.ensure_defaults!(role)
          @permissions[role] = RolePermission.map_for(role)
        end
      end

      def update_batch
        authorize :role_permission, :update?

        updates = params.require(:permissions).permit(
          RolePermission::ROLES.index_with { RolePermission::PAGE_KEYS }
        ).to_h

        ActiveRecord::Base.transaction do
          updates.each do |role, pages|
            next unless RolePermission::ROLES.include?(role)
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
