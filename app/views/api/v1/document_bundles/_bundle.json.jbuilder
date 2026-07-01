json.extract! bundle, :id, :name, :description, :created_at, :updated_at

json.creator do
  json.extract! bundle.creator, :id, :nombre, :apellido
  json.full_name bundle.creator.full_name
end

json.archivos_count bundle.archivos.size

json.archivos bundle.archivos do |archivo|
  json.extract! archivo, :id, :nombre, :estado, :firmado_at
  json.document_type do
    json.extract! archivo.document_type, :id, :name, :code
  end
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
end
