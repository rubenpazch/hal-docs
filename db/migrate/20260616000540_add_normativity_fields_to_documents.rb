class AddNormativityFieldsToDocuments < ActiveRecord::Migration[8.1]
  def change
    # ── documents ────────────────────────────────────────────────────────────
    add_column :documents, :folio_count,         :integer
    add_column :documents, :reference_number,    :string
    add_column :documents, :requires_response,   :boolean, default: false, null: false
    add_column :documents, :author_initials,     :string
    add_column :documents, :direction,           :integer, default: 0, null: false   # entrada, interno, salida
    add_column :documents, :access_level,        :integer, default: 0, null: false   # publico, interno, reservado, confidencial
    add_column :documents, :outside_hours,       :boolean, default: false, null: false
    add_column :documents, :attachment_checksum, :string

    # ── digital_certificates ─────────────────────────────────────────────────
    add_column :digital_certificates, :expires_on,      :date
    add_column :digital_certificates, :revoked,         :boolean, default: false, null: false
    add_column :digital_certificates, :revoked_at,      :datetime
    add_column :digital_certificates, :revoked_reason,  :string

    # ── document_types ────────────────────────────────────────────────────────
    add_column :document_types, :retention_years, :integer

    # ── areas ─────────────────────────────────────────────────────────────────
    add_column :areas, :archive_type, :integer, default: 0   # general, regional, public

    # ── document_flows (trazabilidad por etapa) ───────────────────────────────
    create_table :document_flows do |t|
      t.references :document,     null: false, foreign_key: true
      t.references :from_area,    foreign_key: { to_table: :areas }
      t.references :to_area,      foreign_key: { to_table: :areas }
      t.references :performed_by, null: false, foreign_key: { to_table: :users }
      t.string     :action,       null: false
      t.string     :from_status
      t.string     :to_status
      t.text       :observations
      t.datetime   :performed_at, null: false
      t.timestamps
    end

    # ── virtual_submissions (Mesa Virtual — sin cuenta de usuario) ────────────
    create_table :virtual_submissions do |t|
      t.string   :tracking_number,     null: false
      t.string   :submitter_type,      null: false   # 'natural' | 'juridica'
      t.string   :submitter_name,      null: false
      t.string   :submitter_document,  null: false   # DNI o RUC
      t.string   :submitter_email,     null: false
      t.string   :submitter_phone
      t.string   :submitter_address
      t.string   :company_name
      t.string   :representative_name
      t.references :document_type,     null: false, foreign_key: true
      t.string   :subject,             null: false
      t.text     :observations
      t.integer  :folio_count
      t.integer  :status,              default: 0, null: false
      t.text     :review_notes
      t.datetime :received_at,         null: false
      t.timestamps
    end

    add_index :virtual_submissions, :tracking_number, unique: true
    add_index :virtual_submissions, :submitter_document
    add_index :virtual_submissions, :status
  end
end
