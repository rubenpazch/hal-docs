module Api
  module V1
    module Auth
      class RegistrationsController < Devise::RegistrationsController
        respond_to :json

        private

        def respond_with(resource, _opts = {})
          if resource.persisted?
            render json: {
              message: "Usuario registrado exitosamente",
              user: {
                id:       resource.id,
                email:    resource.email,
                nombre:   resource.nombre,
                apellido: resource.apellido,
                role:     resource.role
              }
            }, status: :created
          else
            render json: {
              message: "No se pudo registrar el usuario",
              errors:  resource.errors.full_messages
            }, status: :unprocessable_entity
          end
        end
      end
    end
  end
end
