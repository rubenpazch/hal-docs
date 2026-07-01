# Signs a PDF document using PAdES-BES (PDF Advanced Electronic Signatures — Basic
# Electronic Signature), producing a signed PDF where the signature is embedded in
# the PDF structure itself, rather than a separate .p7s file.
#
# The signature uses the ETSI.CAdES.detached sub-filter (PAdES baseline B-B), which
# is accepted by Firma Perú.
#
# If signature position coordinates are provided (signature_page, signature_x,
# signature_y as 0–100 percentages), a visible signature box is rendered on that
# page. Otherwise, an invisible signature is embedded.
#
# Usage:
#   result = PadesSigningService.call(
#     file_data:      IO.binread(pdf_path),
#     p12_data:       IO.binread(cert_path),
#     password:       "mi_clave",
#     include_chain:  true,
#     signature_page: 1,      # 1-based page number
#     signature_x:    50.0,   # % from left edge
#     signature_y:    80.0    # % from top edge
#   )
#   result.success?       # => true
#   result.signed_data    # => DER-encoded signed PDF bytes
#   result.error          # => nil

class PadesSigningService
  # Dimensions of the visible signature box in PDF points (1 pt = 1/72 inch).
  SIG_WIDTH  = 220.0
  SIG_HEIGHT = 60.0

  Result = Struct.new(:success, :signed_data, :error, keyword_init: true) do
    def success? = success
  end

  def self.call(**kwargs)
    new(**kwargs).call
  end

  def initialize(file_data:, p12_data:, password:, include_chain: true,
                 signature_page: nil, signature_x: nil, signature_y: nil)
    @file_data      = file_data
    @p12_data       = p12_data
    @password       = password.to_s
    @include_chain  = include_chain
    @signature_page = signature_page
    @signature_x    = signature_x
    @signature_y    = signature_y
  end

  def call
    p12  = OpenSSL::PKCS12.new(@p12_data, @password)
    cert = p12.certificate
    key  = p12.key
    ca   = @include_chain ? (p12.ca_certs || []) : []

    doc       = HexaPDF::Document.new(io: StringIO.new(@file_data))
    sig_field = build_signature_field(doc, cert)
    output    = StringIO.new("".b)

    doc.sign(
      output,
      certificate:       cert,
      key:               key,
      certificate_chain: ca,
      signature_type:    :pades,
      reason:            "Documento firmado digitalmente",
      signature:         sig_field
    )

    Result.new(success: true, signed_data: output.string, error: nil)

  rescue OpenSSL::PKCS12::PKCS12Error
    Result.new(success: false, signed_data: nil, error: "Contraseña incorrecta o archivo inválido.")
  rescue OpenSSL::PKey::PKeyError => e
    Result.new(success: false, signed_data: nil, error: "Error con la clave privada: #{e.message}")
  rescue StandardError => e
    Result.new(success: false, signed_data: nil, error: "Error al firmar: #{e.message}")
  end

  private

  # Returns a signature field. When position params are present, the field has a
  # visible widget with the signer's name and signing date drawn inside.
  # Falls back to an invisible (zero-rect) widget if appearance drawing fails.
  def build_signature_field(doc, cert)
    form      = doc.acro_form(create: true)
    sig_field = form.create_signature_field("Firma1")

    if positioned?
      page_idx = [(@signature_page.to_i - 1), 0].max
      page     = doc.pages[page_idx] || doc.pages.first

      x0, y0 = pdf_coordinates(page)
      widget  = sig_field.create_widget(page, Rect: [x0, y0, x0 + SIG_WIDTH, y0 + SIG_HEIGHT])

      begin
        attach_appearance(doc, widget, cert)
      rescue StandardError
        # Appearance is cosmetic — fall through with an invisible widget.
        widget[:AP] = nil
      end
    else
      # Invisible signature: zero-size rect on the first page.
      sig_field.create_widget(doc.pages.first, Rect: [0, 0, 0, 0])
    end

    sig_field
  end

  def positioned?
    @signature_page && @signature_x && @signature_y
  end

  # Converts percentage-based coordinates (0–100 from top-left of page) to
  # PDF point coordinates (origin at bottom-left).
  def pdf_coordinates(page)
    pw = page.box.width.to_f
    ph = page.box.height.to_f

    x0 = pw * (@signature_x.to_f / 100.0)
    # Percentage is measured from the top; PDF y-axis points upward.
    y0 = ph * (1.0 - @signature_y.to_f / 100.0) - SIG_HEIGHT

    [x0, y0]
  end

  # Draws a simple bordered box with the signer's CN and signing date.
  def attach_appearance(doc, widget, cert)
    w    = SIG_WIDTH
    h    = SIG_HEIGHT
    xobj = doc.add({ Type: :XObject, Subtype: :Form, BBox: [0, 0, w, h] })
    c    = xobj.canvas
    cn   = signer_cn(cert)

    c.stroke_color("000000").line_width(0.5)
     .rectangle(0.5, 0.5, w - 1, h - 1).stroke

    c.font("Helvetica", size: 7).fill_color("000000")
     .text("Firmado digitalmente por:", at: [4, h - 14])
    c.font("Helvetica", size: 9)
     .text(cn, at: [4, h - 28])
    c.font("Helvetica", size: 7)
     .text("Fecha: #{Time.current.strftime('%d/%m/%Y %H:%M')}", at: [4, h - 42])

    widget[:AP] = { N: xobj }
  end

  def signer_cn(cert)
    cert.subject.to_a.find { |name, _value, _type| name == "CN" }&.at(1) ||
      cert.subject.to_s
  end
end
