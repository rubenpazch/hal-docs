class CreateDocumentTypes < ActiveRecord::Migration[8.1]
  def change
    create_table :document_types do |t|
      t.string :name, null: false
      t.text :description
      t.string :code, null: false
      t.boolean :is_active, null: false, default: true

      t.timestamps
    end

    add_index :document_types, :code, unique: true
    add_index :document_types, :is_active
  end
end
