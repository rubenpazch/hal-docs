json.submissions @submissions do |submission|
  json.partial! "submission", submission: submission
end

json.meta do
  json.total        @pagy.count
  json.per_page     @pagy.limit
  json.current_page @pagy.page
  json.total_pages  @pagy.pages
  json.from         @pagy.from
  json.to           @pagy.to
end
