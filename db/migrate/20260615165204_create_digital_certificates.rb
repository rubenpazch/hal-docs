class CreateDigitalCertificates < ActiveRecord::Migration[8.1]
  def change
    create_table :digital_certificates do |t|
      t.references :user, null: false, foreign_key: true

      # Display info
      t.string :alias_name,   null: false
      t.string :issued_to                       # CN extracted from subject

      # Metadata extracted from .p12 at upload time
      t.string   :serial_number
      t.string   :subject_dn
      t.string   :issuer_dn
      t.datetime :valid_from
      t.datetime :valid_until

      # State
      t.boolean  :is_default,  default: false, null: false
      t.datetime :discarded_at                  # soft delete (Discard)

      t.timestamps
    end

    add_index :digital_certificates, :discarded_at
    add_index :digital_certificates, [:user_id, :is_default]
  end
end
