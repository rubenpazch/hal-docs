class CreateAreaMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :area_memberships do |t|
      t.references :user, null: false, foreign_key: true
      t.references :area, null: false, foreign_key: true
      t.integer :position_role, null: false, default: 3
      t.boolean :is_active, null: false, default: true

      t.timestamps
    end

    add_index :area_memberships, [:user_id, :area_id], unique: true
  end
end
