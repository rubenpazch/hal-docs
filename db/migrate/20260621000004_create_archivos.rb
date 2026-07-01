class CreateArchivos < ActiveRecord::Migration[8.1]
  def change
    # ── File repository — documents that exist independently of any tramite ──
    create_table :archivos do |t|
      t.references :uploader,      null: false, foreign_key: { to_table: :users }
      t.references :document_type, null: false, foreign_key: true
      t.string  :nombre,    null: false
      t.integer :estado,    null: false, default: 0   # 0=borrador, 1=firmado
      t.datetime :firmado_at
      t.timestamps
    end

    add_index :archivos, :estado

    # ── Join table: tramite ↔ archivos (many-to-many) ──────────────────────
    create_table :document_archivos do |t|
      t.references :document, null: false, foreign_key: true
      t.references :archivo,  null: false, foreign_key: true
      t.timestamps
    end

    add_index :document_archivos, [:document_id, :archivo_id], unique: true
  end
end
