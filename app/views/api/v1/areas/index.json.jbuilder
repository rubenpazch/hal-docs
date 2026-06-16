json.areas @areas do |area|
  json.partial! "area", area: area, include_children: true
end

json.meta do
  json.total @areas.size
end
