class DocumentTypeSerializer < Blueprinter::Base
  identifier :id
  fields :name, :code, :description, :is_active
end
