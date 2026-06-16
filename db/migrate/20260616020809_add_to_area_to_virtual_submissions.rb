class AddToAreaToVirtualSubmissions < ActiveRecord::Migration[8.1]
  def change
    add_reference :virtual_submissions, :to_area, foreign_key: { to_table: :areas }, null: true
  end
end
