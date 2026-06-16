json.certificates @certificates do |cert|
  json.partial! "certificate", cert: cert
end

json.meta do
  json.total @certificates.size
end
