class CreateVirtualSubmissionFlows < ActiveRecord::Migration[8.1]
  def change
    create_table :virtual_submission_flows do |t|
      t.references :virtual_submission, null: false, foreign_key: true, index: true
      t.references :from_area,          foreign_key: { to_table: :areas }, index: true
      t.references :to_area,            foreign_key: { to_table: :areas }, index: true
      t.references :performed_by,       foreign_key: { to_table: :users }, index: true
      t.string  :action,      null: false   # registrado | en_revision | observado | derivado | finalizado
      t.string  :from_status
      t.string  :to_status,   null: false
      t.text    :notes
      t.datetime :performed_at, null: false
      t.timestamps
    end
  end
end
