class AddIsDefaultToAreas < ActiveRecord::Migration[8.1]
  def change
    add_column :areas, :is_default, :boolean, default: false, null: false
    add_index  :areas, :is_default, where: "is_default = true",
               name: "index_areas_on_is_default_unique", unique: true
  end
end
