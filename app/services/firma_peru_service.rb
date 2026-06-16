# Client for the Plataforma FIRMA PERÚ digital signature validation API.
# See: Resolución PCM/SGTD N° 002-2022
#
# Configuration (via ENV or Rails credentials):
#   FIRMA_PERU_URL        — base URL of the deployed validador module
#                           e.g. http://10.0.0.5:8080/validador
#   FIRMA_PERU_CREDENTIAL — credential string registered in credentials.json
#
# Usage:
#   result = FirmaPeruService.new.validate(attachment: active_storage_attachment)
#   result.valid?       # => true / false / nil (service unavailable)
#   result.result_text  # => "RESULTADO VÁLIDO" | "RESULTADO NO VÁLIDO" | ...
#   result.signatures   # => Array of signature hashes from listSignatures
#   result.error        # => error message string (if failed)

class FirmaPeruService
  Result = Struct.new(:valid, :result_text, :signatures, :raw, :error, keyword_init: true) do
    def valid?      = valid
    def available?  = error.nil?
  end

  RESULT_VALID         = "RESULTADO VÁLIDO"
  RESULT_INDETERMINATE = "RESULTADO INDETERMINADO"
  RESULT_INVALID       = "RESULTADO NO VÁLIDO"
  RESULT_NO_SIGNATURES = "SIN FIRMAS DIGITALES"

  def initialize
    @base_url   = ENV.fetch("FIRMA_PERU_URL", "http://127.0.0.1:8080/validador")
    @credential = ENV.fetch("FIRMA_PERU_CREDENTIAL", "")
  end

  # Validates a signed document.
  # @param attachment [ActiveStorage::Attachment] — the document's file attachment
  # @return [Result]
  def validate(attachment:)
    raise ArgumentError, "attachment must be attached" unless attachment.attached?

    extension = File.extname(attachment.filename.to_s).delete(".").downcase

    attachment.open do |tempfile|
      call_validation_api(tempfile.path, extension)
    end

  rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
    Result.new(
      valid:       nil,
      result_text: nil,
      signatures:  [],
      raw:         {},
      error:       "No se pudo conectar con el servicio FIRMA PERÚ: #{e.message}. " \
                   "Verifique que el módulo validador esté desplegado en #{@base_url}."
    )
  rescue StandardError => e
    Result.new(valid: nil, result_text: nil, signatures: [], raw: {}, error: e.message)
  end

  # Checks that the validador service is reachable and configured.
  # @return [Hash] info response or nil
  def info
    response = connection.get("/api/info")
    JSON.parse(response.body)
  rescue StandardError
    nil
  end

  private

  def call_validation_api(file_path, extension)
    payload = {
      param:      { documentExtension: extension }.to_json,
      credential: @credential,
      signed:     Faraday::UploadIO.new(file_path, "application/octet-stream")
    }

    response = multipart_connection.post("/api/validation", payload)
    body     = JSON.parse(response.body)

    Result.new(
      valid:       body["result"] == RESULT_VALID,
      result_text: body["result"],
      signatures:  body["listSignatures"] || [],
      raw:         body,
      error:       body["errorMessage"].presence
    )
  rescue JSON::ParserError => e
    Result.new(valid: nil, result_text: nil, signatures: [], raw: {}, error: "Respuesta inválida del servicio: #{e.message}")
  end

  def connection
    Faraday.new(url: @base_url) do |f|
      f.adapter Faraday.default_adapter
    end
  end

  def multipart_connection
    Faraday.new(url: @base_url) do |f|
      f.request  :multipart
      f.request  :url_encoded
      f.adapter  Faraday.default_adapter
    end
  end
end
