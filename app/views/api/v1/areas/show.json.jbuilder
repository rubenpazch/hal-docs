json.area do
  json.partial! "area", area: @area, include_children: false, include_memberships: true
end
