# Parses a PKCS#12 (.p12 / .pfx) certificate file using Ruby's built-in OpenSSL
# and returns a hash of certificate metadata.
#
# Usage:
#   result = CertificateParserService.call(file_data, password)
#   result.success?   # => true / false
#   result.metadata   # => { alias_name:, issued_to:, serial_number:, ... }
#   result.error      # => "Contraseña incorrecta…" (on failure)

class CertificateParserService
  Result = Struct.new(:success, :metadata, :error, keyword_init: true) do
    def success? = success
  end

  # @param file_data [String] raw binary content of the .p12 / .pfx file
  # @param password  [String] passphrase protecting the certificate
  def self.call(file_data, password)
    new(file_data, password).call
  end

  def initialize(file_data, password)
    @file_data = file_data
    @password  = password.to_s
  end

  def call
    p12  = OpenSSL::PKCS12.new(@file_data, @password)
    cert = p12.certificate

    metadata = {
      issued_to:     extract_cn(cert.subject.to_s),
      serial_number: cert.serial.to_s(16).upcase,
      subject_dn:    cert.subject.to_s,
      issuer_dn:     cert.issuer.to_s,
      valid_from:    cert.not_before,
      valid_until:   cert.not_after
    }

    Result.new(success: true, metadata: metadata, error: nil)

  rescue OpenSSL::PKCS12::PKCS12Error
    Result.new(
      success:  false,
      metadata: nil,
      error:    "Contraseña incorrecta o archivo de certificado inválido."
    )
  rescue OpenSSL::X509::CertificateError => e
    Result.new(success: false, metadata: nil, error: "Error al leer el certificado: #{e.message}")
  rescue StandardError => e
    Result.new(success: false, metadata: nil, error: "Error inesperado: #{e.message}")
  end

  private

  # Extracts the CN (Common Name) value from an OpenSSL subject string.
  # e.g. "/CN=JUAN PEREZ/O=RENIEC/C=PE" → "JUAN PEREZ"
  def extract_cn(subject_string)
    match = subject_string.match(/CN=([^,\/]+)/)
    match ? match[1].strip : subject_string
  end
end
