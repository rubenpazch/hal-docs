class AddSignaturePositionToArchivos < ActiveRecord::Migration[8.1]
  def change
    add_column :archivos, :signature_page, :integer
    add_column :archivos, :signature_x,    :decimal, precision: 5, scale: 2
    add_column :archivos, :signature_y,    :decimal, precision: 5, scale: 2
  end
end
