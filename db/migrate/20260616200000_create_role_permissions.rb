class CreateRolePermissions < ActiveRecord::Migration[8.1]
  def change
    create_table :role_permissions do |t|
      t.string  :role,     null: false
      t.string  :page_key, null: false
      t.boolean :allowed,  null: false, default: true

      t.timestamps
    end

    add_index :role_permissions, [ :role, :page_key ], unique: true
  end
end
