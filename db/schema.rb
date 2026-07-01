# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_21_000006) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "archivos", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "document_type_id", null: false
    t.integer "estado", default: 0, null: false
    t.datetime "firmado_at"
    t.string "nombre", null: false
    t.integer "signature_page"
    t.decimal "signature_x", precision: 5, scale: 2
    t.decimal "signature_y", precision: 5, scale: 2
    t.datetime "updated_at", null: false
    t.bigint "uploader_id", null: false
    t.index ["document_type_id"], name: "index_archivos_on_document_type_id"
    t.index ["estado"], name: "index_archivos_on_estado"
    t.index ["uploader_id"], name: "index_archivos_on_uploader_id"
  end

  create_table "area_memberships", force: :cascade do |t|
    t.bigint "area_id", null: false
    t.datetime "created_at", null: false
    t.boolean "is_active", default: true, null: false
    t.integer "position_role", default: 3, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["area_id"], name: "index_area_memberships_on_area_id"
    t.index ["user_id", "area_id"], name: "index_area_memberships_on_user_id_and_area_id", unique: true
    t.index ["user_id"], name: "index_area_memberships_on_user_id"
  end

  create_table "areas", force: :cascade do |t|
    t.integer "archive_type", default: 0
    t.integer "area_type", default: 0, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "discarded_at"
    t.boolean "is_default", default: false, null: false
    t.string "name", null: false
    t.integer "parent_id"
    t.datetime "updated_at", null: false
    t.index ["discarded_at"], name: "index_areas_on_discarded_at"
    t.index ["is_default"], name: "index_areas_on_is_default_unique", unique: true, where: "(is_default = true)"
    t.index ["parent_id"], name: "index_areas_on_parent_id"
  end

  create_table "bundle_archivos", force: :cascade do |t|
    t.bigint "archivo_id", null: false
    t.datetime "created_at", null: false
    t.bigint "document_bundle_id", null: false
    t.integer "position", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["archivo_id"], name: "index_bundle_archivos_on_archivo_id"
    t.index ["document_bundle_id", "archivo_id"], name: "idx_bundle_archivos_unique", unique: true
    t.index ["document_bundle_id"], name: "index_bundle_archivos_on_document_bundle_id"
  end

  create_table "digital_certificates", force: :cascade do |t|
    t.string "alias_name", null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.date "expires_on"
    t.boolean "is_default", default: false, null: false
    t.string "issued_to"
    t.string "issuer_dn"
    t.boolean "revoked", default: false, null: false
    t.datetime "revoked_at"
    t.string "revoked_reason"
    t.string "serial_number"
    t.string "subject_dn"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.datetime "valid_from"
    t.datetime "valid_until"
    t.index ["discarded_at"], name: "index_digital_certificates_on_discarded_at"
    t.index ["user_id", "is_default"], name: "index_digital_certificates_on_user_id_and_is_default"
    t.index ["user_id"], name: "index_digital_certificates_on_user_id"
  end

  create_table "document_archivos", force: :cascade do |t|
    t.bigint "archivo_id", null: false
    t.datetime "created_at", null: false
    t.bigint "document_id", null: false
    t.datetime "updated_at", null: false
    t.index ["archivo_id"], name: "index_document_archivos_on_archivo_id"
    t.index ["document_id", "archivo_id"], name: "index_document_archivos_on_document_id_and_archivo_id", unique: true
    t.index ["document_id"], name: "index_document_archivos_on_document_id"
  end

  create_table "document_bundles", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "creator_id", null: false
    t.text "description"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["creator_id"], name: "index_document_bundles_on_creator_id"
  end

  create_table "document_flows", force: :cascade do |t|
    t.string "action", null: false
    t.datetime "created_at", null: false
    t.bigint "document_id", null: false
    t.bigint "from_area_id"
    t.string "from_status"
    t.text "observations"
    t.datetime "performed_at", null: false
    t.bigint "performed_by_id", null: false
    t.bigint "to_area_id"
    t.string "to_status"
    t.datetime "updated_at", null: false
    t.index ["document_id"], name: "index_document_flows_on_document_id"
    t.index ["from_area_id"], name: "index_document_flows_on_from_area_id"
    t.index ["performed_by_id"], name: "index_document_flows_on_performed_by_id"
    t.index ["to_area_id"], name: "index_document_flows_on_to_area_id"
  end

  create_table "document_types", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.boolean "is_active", default: true, null: false
    t.string "name", null: false
    t.integer "retention_years"
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_document_types_on_code", unique: true
    t.index ["is_active"], name: "index_document_types_on_is_active"
  end

  create_table "documents", force: :cascade do |t|
    t.integer "access_level", default: 0, null: false
    t.bigint "area_id"
    t.string "attachment_checksum"
    t.string "author_initials"
    t.datetime "created_at", null: false
    t.bigint "created_by_id", null: false
    t.integer "direction", default: 0, null: false
    t.string "document_number"
    t.bigint "document_type_id", null: false
    t.date "due_date"
    t.integer "folio_count"
    t.text "observations"
    t.boolean "outside_hours", default: false, null: false
    t.integer "priority", default: 1, null: false
    t.datetime "received_at"
    t.string "recipient", null: false
    t.string "reference_number"
    t.boolean "requires_response", default: false, null: false
    t.string "sender", null: false
    t.integer "status", default: 0, null: false
    t.string "subject", null: false
    t.datetime "updated_at", null: false
    t.index ["area_id"], name: "index_documents_on_area_id"
    t.index ["created_by_id"], name: "index_documents_on_created_by_id"
    t.index ["document_number"], name: "index_documents_on_document_number", unique: true, where: "(document_number IS NOT NULL)"
    t.index ["document_type_id"], name: "index_documents_on_document_type_id"
    t.index ["priority"], name: "index_documents_on_priority"
    t.index ["status"], name: "index_documents_on_status"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "exp", null: false
    t.string "jti", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "role_permissions", force: :cascade do |t|
    t.boolean "allowed", default: true, null: false
    t.datetime "created_at", null: false
    t.string "page_key", null: false
    t.string "role", null: false
    t.datetime "updated_at", null: false
    t.index ["role", "page_key"], name: "index_role_permissions_on_role_and_page_key", unique: true
  end

  create_table "system_roles", force: :cascade do |t|
    t.string "bg_color", default: "#ede9fe", null: false
    t.string "color", default: "#5b21b6", null: false
    t.datetime "created_at", null: false
    t.string "display_name", null: false
    t.boolean "is_system", default: false, null: false
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_system_roles_on_name", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "apellido", default: "", null: false
    t.string "area"
    t.bigint "area_id"
    t.string "cargo"
    t.datetime "created_at", null: false
    t.datetime "discarded_at"
    t.string "dni", default: "", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "nombre", default: "", null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.string "role", default: "staff", null: false
    t.string "telefono"
    t.datetime "updated_at", null: false
    t.index ["area_id"], name: "index_users_on_area_id"
    t.index ["discarded_at"], name: "index_users_on_discarded_at"
    t.index ["dni"], name: "index_users_on_dni", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "versions", force: :cascade do |t|
    t.datetime "created_at"
    t.string "event", null: false
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.text "object"
    t.text "object_changes"
    t.string "whodunnit"
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  create_table "virtual_submission_flows", force: :cascade do |t|
    t.string "action", null: false
    t.datetime "created_at", null: false
    t.bigint "from_area_id"
    t.string "from_status"
    t.text "notes"
    t.datetime "performed_at", null: false
    t.bigint "performed_by_id"
    t.bigint "to_area_id"
    t.string "to_status", null: false
    t.datetime "updated_at", null: false
    t.bigint "virtual_submission_id", null: false
    t.index ["from_area_id"], name: "index_virtual_submission_flows_on_from_area_id"
    t.index ["performed_by_id"], name: "index_virtual_submission_flows_on_performed_by_id"
    t.index ["to_area_id"], name: "index_virtual_submission_flows_on_to_area_id"
    t.index ["virtual_submission_id"], name: "index_virtual_submission_flows_on_virtual_submission_id"
  end

  create_table "virtual_submissions", force: :cascade do |t|
    t.string "company_name"
    t.datetime "created_at", null: false
    t.bigint "document_type_id", null: false
    t.integer "folio_count"
    t.text "observations"
    t.datetime "received_at", null: false
    t.string "representative_name"
    t.text "review_notes"
    t.integer "status", default: 0, null: false
    t.string "subject", null: false
    t.string "submitter_address"
    t.string "submitter_document", null: false
    t.string "submitter_email", null: false
    t.string "submitter_name", null: false
    t.string "submitter_phone"
    t.string "submitter_type", null: false
    t.bigint "to_area_id"
    t.string "tracking_number", null: false
    t.datetime "updated_at", null: false
    t.index ["document_type_id"], name: "index_virtual_submissions_on_document_type_id"
    t.index ["status"], name: "index_virtual_submissions_on_status"
    t.index ["submitter_document"], name: "index_virtual_submissions_on_submitter_document"
    t.index ["to_area_id"], name: "index_virtual_submissions_on_to_area_id"
    t.index ["tracking_number"], name: "index_virtual_submissions_on_tracking_number", unique: true
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "archivos", "document_types"
  add_foreign_key "archivos", "users", column: "uploader_id"
  add_foreign_key "area_memberships", "areas"
  add_foreign_key "area_memberships", "users"
  add_foreign_key "bundle_archivos", "archivos"
  add_foreign_key "bundle_archivos", "document_bundles"
  add_foreign_key "digital_certificates", "users"
  add_foreign_key "document_archivos", "archivos"
  add_foreign_key "document_archivos", "documents"
  add_foreign_key "document_bundles", "users", column: "creator_id"
  add_foreign_key "document_flows", "areas", column: "from_area_id"
  add_foreign_key "document_flows", "areas", column: "to_area_id"
  add_foreign_key "document_flows", "documents"
  add_foreign_key "document_flows", "users", column: "performed_by_id"
  add_foreign_key "documents", "areas"
  add_foreign_key "documents", "document_types"
  add_foreign_key "documents", "users", column: "created_by_id"
  add_foreign_key "users", "areas"
  add_foreign_key "virtual_submission_flows", "areas", column: "from_area_id"
  add_foreign_key "virtual_submission_flows", "areas", column: "to_area_id"
  add_foreign_key "virtual_submission_flows", "users", column: "performed_by_id"
  add_foreign_key "virtual_submission_flows", "virtual_submissions"
  add_foreign_key "virtual_submissions", "areas", column: "to_area_id"
  add_foreign_key "virtual_submissions", "document_types"
end
