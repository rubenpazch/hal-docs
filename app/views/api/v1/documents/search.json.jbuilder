json.documents @documents do |document|
  json.partial! "document", document: document
end
