module Api
  module V1
    class AreasController < ApplicationController
      before_action :set_area, only: [:show, :update, :destroy, :restore, :members, :add_member, :update_member, :remove_member]

      def index
        authorize Area
        @areas = Area.kept.includes(:parent, :children, area_memberships: :user)
        @areas = @areas.ransack(params[:q]).result if params[:q]
      end

      def show
        authorize @area
      end

      def create
        authorize Area
        @area = Area.new(area_params)

        if @area.save
          @area = Area.includes(:parent, :children, area_memberships: :user).find(@area.id)
          render :show, status: :created
        else
          render json: {
            message: "No se pudo crear el área",
            errors:  @area.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def update
        authorize @area
        if @area.update(area_params)
          @area = Area.includes(:parent, :children, area_memberships: :user).find(@area.id)
          render :show
        else
          render json: {
            message: "No se pudo actualizar el área",
            errors:  @area.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def destroy
        authorize @area
        @area.discard
        render json: { message: "Área desactivada exitosamente" }
      end

      def restore
        authorize @area
        @area.undiscard
        render json: { message: "Área reactivada exitosamente" }
      end

      def members
        authorize @area
        @memberships = @area.area_memberships.includes(:user, :area)
      end

      def add_member
        authorize @area, :update?
        user = User.find(params[:user_id])
        membership = @area.area_memberships.find_or_initialize_by(user: user)
        membership.position_role = params[:position_role].presence || "soporte"
        membership.is_active = true

        if membership.save
          @membership = membership.reload
          @membership = AreaMembership.includes(:user, :area).find(@membership.id)
          render :member, status: :created
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update_member
        authorize @area, :update?
        membership = @area.area_memberships.find(params[:membership_id])
        membership.assign_attributes(
          position_role: params[:position_role].presence || membership.position_role,
          is_active:     params.key?(:is_active) ? params[:is_active] : membership.is_active
        )

        if membership.save
          @membership = AreaMembership.includes(:user, :area).find(membership.id)
          render :member
        else
          render json: { errors: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def remove_member
        authorize @area, :update?
        membership = @area.area_memberships.find(params[:membership_id])
        membership.destroy
        render json: { message: "Miembro removido del área" }
      end

      private

      def set_area
        @area = Area.includes(:parent, :children, area_memberships: :user).find(params[:id])
      end

      def area_params
        params.require(:area).permit(:name, :description, :area_type, :parent_id)
      end
    end
  end
end
