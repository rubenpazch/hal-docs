# Signs a document file using a stored PKCS#12 certificate (CAdES detached signature).
# The resulting .p7s file can be validated by the FIRMA PERÚ service.
#
# Usage:
#   result = DocumentSigningService.call(
#     file_data:    IO.binread(path),
#     p12_data:     IO.binread(cert_path),
#     password:     "mi_clave",
#     include_chain: true
#   )
#   result.success?       # => true
#   result.signed_data    # => DER-encoded P7S bytes
#   result.error          # => nil

class DocumentSigningService
  Result = Struct.new(:success, :signed_data, :error, keyword_init: true) do
    def success? = success
  end

  # @param file_data    [String]  raw binary content of the document to sign
  # @param p12_data     [String]  raw binary content of the .p12 certificate
  # @param password     [String]  passphrase of the .p12 file
  # @param include_chain [Boolean] whether to embed the CA chain in the signature
  def self.call(file_data:, p12_data:, password:, include_chain: true)
    new(file_data: file_data, p12_data: p12_data, password: password, include_chain: include_chain).call
  end

  def initialize(file_data:, p12_data:, password:, include_chain:)
    @file_data     = file_data
    @p12_data      = p12_data
    @password      = password.to_s
    @include_chain = include_chain
  end

  def call
    p12  = OpenSSL::PKCS12.new(@p12_data, @password)
    cert = p12.certificate
    key  = p12.key
    ca   = @include_chain ? (p12.ca_certs || []) : []

    flags = OpenSSL::PKCS7::DETACHED | OpenSSL::PKCS7::BINARY

    signed = OpenSSL::PKCS7.sign(cert, key, @file_data, ca, flags)

    Result.new(success: true, signed_data: signed.to_der, error: nil)

  rescue OpenSSL::PKCS12::PKCS12Error
    Result.new(success: false, signed_data: nil, error: "Contraseña incorrecta o archivo inválido.")
  rescue OpenSSL::PKey::PKeyError => e
    Result.new(success: false, signed_data: nil, error: "Error con la clave privada: #{e.message}")
  rescue StandardError => e
    Result.new(success: false, signed_data: nil, error: "Error al firmar: #{e.message}")
  end
end
