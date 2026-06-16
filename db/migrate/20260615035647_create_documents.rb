class CreateDocuments < ActiveRecord::Migration[8.1]
  def change
    create_table :documents do |t|
      t.references :document_type, null: false, foreign_key: true
      t.references :area, null: true, foreign_key: true
      t.bigint :created_by_id, null: false
      t.string :subject, null: false
      t.string :sender, null: false
      t.string :recipient, null: false
      t.integer :priority, null: false, default: 1
      t.integer :status, null: false, default: 0
      t.text :observations
      t.string :document_number
      t.datetime :received_at
      t.date :due_date

      t.timestamps
    end

    add_foreign_key :documents, :users, column: :created_by_id
    add_index :documents, :created_by_id
    add_index :documents, :status
    add_index :documents, :priority
    add_index :documents, :document_number, unique: true, where: "document_number IS NOT NULL"
  end
end
