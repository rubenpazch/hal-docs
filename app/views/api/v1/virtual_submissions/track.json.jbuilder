json.submissions @submissions do |submission|
  json.partial! "virtual_submission", submission: submission

  # Timeline — flows are sorted in memory from pre-loaded association
  json.timeline submission.flows.sort_by(&:performed_at) do |flow|
    json.date        flow.performed_at
    json.action      flow.action
    json.from_status flow.from_status
    json.status      flow.to_status
    json.notes       flow.notes

    if flow.from_area
      json.from_area flow.from_area.name
    else
      json.from_area nil
    end

    if flow.to_area
      json.area flow.to_area.name
    else
      json.area nil
    end
  end
end
