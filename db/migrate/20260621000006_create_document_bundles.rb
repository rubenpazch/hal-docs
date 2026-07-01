class CreateDocumentBundles < ActiveRecord::Migration[8.1]
  def change
    create_table :document_bundles do |t|
      t.references :creator, null: false, foreign_key: { to_table: :users }
      t.string :name, null: false
      t.text   :description
      t.timestamps
    end

    create_table :bundle_archivos do |t|
      t.references :document_bundle, null: false, foreign_key: true
      t.references :archivo,         null: false, foreign_key: true
      t.integer    :position, default: 0, null: false
      t.timestamps
    end

    add_index :bundle_archivos, [:document_bundle_id, :archivo_id],
              unique: true, name: "idx_bundle_archivos_unique"
  end
end
