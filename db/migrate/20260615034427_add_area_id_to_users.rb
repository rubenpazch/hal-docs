class AddAreaIdToUsers < ActiveRecord::Migration[8.1]
  def change
    add_reference :users, :area, null: true, foreign_key: true
  end
end
