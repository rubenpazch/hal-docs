json.archivos @archivos do |archivo|
  json.partial! "archivo", archivo: archivo
end

json.meta do
  json.total       @total_count
  json.page        @current_page
  json.per_page    20
  json.total_pages @total_pages
end
