class CreateAreas < ActiveRecord::Migration[8.1]
  def change
    create_table :areas do |t|
      t.string :name, null: false
      t.text :description
      t.integer :parent_id
      t.integer :area_type, null: false, default: 0
      t.datetime :discarded_at

      t.timestamps
    end

    add_index :areas, :parent_id
    add_index :areas, :discarded_at
  end
end
