json.extract! archivo, :id, :nombre, :estado, :firmado_at,
                        :signature_page, :signature_x, :signature_y,
                        :created_at, :updated_at

json.document_type do
  json.extract! archivo.document_type, :id, :name, :code
end

json.uploader do
  json.extract! archivo.uploader, :id, :nombre, :apellido
  json.full_name archivo.uploader.full_name
end

json.tramites_count archivo.tramites_count

if archivo.file.attached?
  json.file do
    json.filename     archivo.file.filename.to_s
    json.content_type archivo.file.content_type
    json.byte_size    archivo.file.byte_size
    json.url          archivo.file_url
  end
else
  json.file nil
end
