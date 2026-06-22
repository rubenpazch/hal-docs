class CreateSystemRoles < ActiveRecord::Migration[7.1]
  def change
    create_table :system_roles do |t|
      t.string  :name,         null: false
      t.string  :display_name, null: false
      t.string  :color,        null: false, default: "#5b21b6"
      t.string  :bg_color,     null: false, default: "#ede9fe"
      t.boolean :is_system,    null: false, default: false

      t.timestamps
    end

    add_index :system_roles, :name, unique: true

    # Seed the 3 built-in roles immediately so the users migration can
    # reference them (data migration runs in the next migration file).
    reversible do |dir|
      dir.up do
        execute <<~SQL
          INSERT INTO system_roles (name, display_name, color, bg_color, is_system, created_at, updated_at)
          VALUES
            ('admin',   'Administrador', '#9d174d', '#fce7f3', TRUE,  NOW(), NOW()),
            ('manager', 'Gestor',        '#5b21b6', '#ede9fe', TRUE,  NOW(), NOW()),
            ('staff',   'Personal',      '#0369a1', '#e0f2fe', TRUE,  NOW(), NOW())
        SQL
      end

      dir.down do
        execute "DELETE FROM system_roles WHERE name IN ('admin','manager','staff')"
      end
    end
  end
end
