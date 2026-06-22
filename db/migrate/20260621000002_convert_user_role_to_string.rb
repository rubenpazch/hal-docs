class ConvertUserRoleToString < ActiveRecord::Migration[7.1]
  def up
    # 1. Add temporary string column
    add_column :users, :role_str, :string

    # 2. Populate it from the existing integer enum values
    execute <<~SQL
      UPDATE users SET role_str = CASE role
        WHEN 0 THEN 'admin'
        WHEN 1 THEN 'manager'
        WHEN 2 THEN 'staff'
        ELSE 'staff'
      END
    SQL

    # 3. Remove the old integer column and rename the new one
    remove_column :users, :role
    rename_column :users, :role_str, :role

    # 4. Apply constraints
    change_column_null    :users, :role, false, "staff"
    change_column_default :users, :role, "staff"
  end

  def down
    add_column :users, :role_int, :integer

    execute <<~SQL
      UPDATE users SET role_int = CASE role
        WHEN 'admin'   THEN 0
        WHEN 'manager' THEN 1
        WHEN 'staff'   THEN 2
        ELSE 2
      END
    SQL

    remove_column :users, :role
    rename_column :users, :role_int, :role

    change_column_null    :users, :role, false, 2
    change_column_default :users, :role, 2
  end
end
