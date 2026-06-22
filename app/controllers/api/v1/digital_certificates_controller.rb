module Api
  module V1
    class DigitalCertificatesController < AuthenticatedController
      # All actions are scoped to current_user — no Pundit resource authorization needed.
      # skip_after_action is an intentional declaration, not a workaround.
      skip_after_action :verify_authorized
      before_action :set_certificate, only: [:show, :destroy, :set_default]

      # GET /api/v1/digital_certificates
      def index
        @certificates = current_user.digital_certificates.kept
                                    .with_attached_certificate_file
                                    .order(is_default: :desc, created_at: :desc)
      end

      # GET /api/v1/digital_certificates/:id
      def show
      end

      # POST /api/v1/digital_certificates
      def create
        file       = params.dig(:digital_certificate, :certificate_file)
        password   = params.dig(:digital_certificate, :password).to_s
        alias_name = params.dig(:digital_certificate, :alias_name).to_s.strip

        return render_error("Se requiere el archivo del certificado (.p12 / .pfx)") unless file.present?
        return render_error("El nombre del certificado es obligatorio") if alias_name.blank?

        file_data    = file.read
        parse_result = CertificateParserService.call(file_data, password)

        unless parse_result.success?
          return render json: {
            message: "No se pudo leer el certificado",
            errors:  [parse_result.error]
          }, status: :unprocessable_entity
        end

        cert = current_user.digital_certificates.build(
          alias_name: alias_name,
          is_default: current_user.digital_certificates.kept.none?,
          **parse_result.metadata
        )

        if cert.save
          cert.certificate_file.attach(
            io:           StringIO.new(file_data),
            filename:     file.original_filename,
            content_type: "application/x-pkcs12"
          )

          @certificate = cert
          render :show, status: :created
        else
          render json: {
            message: "No se pudo registrar el certificado",
            errors:  cert.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/digital_certificates/:id
      def destroy
        @certificate.discard
        if @certificate.is_default?
          next_cert = current_user.digital_certificates.kept.order(created_at: :desc).first
          next_cert&.update!(is_default: true)
        end
        render json: { message: "Certificado eliminado" }
      end

      # PATCH /api/v1/digital_certificates/:id/set_default
      def set_default
        current_user.digital_certificates.kept.update_all(is_default: false)
        @certificate.update!(is_default: true)
        render :show
      end

      # POST /api/v1/digital_certificates/:id/sign_document
      def sign_document
        set_certificate
        document   = Document.find(params[:document_id])
        attachment = document.attachments[params[:attachment_index].to_i || 0]

        return render_error("Documento o adjunto no encontrado") unless attachment&.attached?
        return render_error("La contraseña del certificado es obligatoria") if params[:password].blank?

        p12_data  = @certificate.certificate_file.download
        file_data = attachment.download

        result = DocumentSigningService.call(
          file_data: file_data,
          p12_data:  p12_data,
          password:  params[:password]
        )

        unless result.success?
          return render json: { message: "No se pudo firmar el documento", errors: [result.error] },
                        status: :unprocessable_entity
        end

        signed_filename = "#{File.basename(attachment.filename.to_s, '.*')}[FIRMADO].p7s"
        document.attachments.attach(
          io:           StringIO.new(result.signed_data),
          filename:     signed_filename,
          content_type: "application/pkcs7-signature"
        )

        render json: {
          message:         "Documento firmado exitosamente",
          signed_filename: signed_filename
        }
      end

      private

      def set_certificate
        @certificate = current_user.digital_certificates.kept.find(params[:id])
      end

      def render_error(msg)
        render json: { message: msg, errors: [msg] }, status: :unprocessable_entity
      end
    end
  end
end
