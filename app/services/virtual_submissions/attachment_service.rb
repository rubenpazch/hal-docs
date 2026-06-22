module VirtualSubmissions
  # Validates and stores uploaded files for a VirtualSubmission.
  #
  # Active Storage selects the backend from the environment config automatically:
  #   development / test  →  Disk  (storage/ or tmp/storage/)
  #   production          →  Amazon S3  (bucket from ENV['AWS_BUCKET'])
  #
  # Validation runs BEFORE any file is written to storage, so a failed
  # validation never produces orphaned blobs on disk or in S3.
  #
  # Usage:
  #   result = VirtualSubmissions::AttachmentService.call(
  #     submission: @submission,
  #     files:      params[:attachments]
  #   )
  #   result.success?        # => true / false
  #   result.attached_count  # => Integer (0 when not success)
  #   result.errors          # => [] or ["'doc.exe': tipo de archivo no permitido …"]
  class AttachmentService
    ALLOWED_CONTENT_TYPES = %w[
      application/pdf
      image/jpeg
      image/png
    ].freeze

    ALLOWED_EXTENSIONS = %w[.pdf .jpg .jpeg .png].freeze

    MAX_FILE_SIZE  = 10.megabytes
    MAX_FILE_COUNT = 5

    Result = Struct.new(:success, :attached_count, :errors, keyword_init: true) do
      def success? = success
    end

    def self.call(submission:, files:)
      new(submission: submission, files: files).call
    end

    def initialize(submission:, files:)
      @submission = submission
      @files      = normalize(files)
    end

    def call
      return Result.new(success: true, attached_count: 0, errors: []) if @files.empty?

      errors = validate(@files)
      return Result.new(success: false, attached_count: 0, errors: errors) if errors.any?

      @files.each { |file| @submission.attachments.attach(file) }
      Result.new(success: true, attached_count: @files.size, errors: [])
    end

    private

    # Coerce to array and drop anything that is not a real uploaded file.
    def normalize(files)
      Array(files).compact.select { |f| f.respond_to?(:read) }
    end

    def validate(files)
      errors = []

      if files.size > MAX_FILE_COUNT
        return ["Se permite un máximo de #{MAX_FILE_COUNT} archivos adjuntos por trámite"]
      end

      files.each do |file|
        name = file.respond_to?(:original_filename) ? file.original_filename : "archivo"
        ext  = File.extname(name.to_s).downcase

        content_type_ok = ALLOWED_CONTENT_TYPES.include?(file.content_type)
        extension_ok    = ALLOWED_EXTENSIONS.include?(ext)

        unless content_type_ok || extension_ok
          errors << "'#{name}': tipo de archivo no permitido (solo PDF, JPG, PNG)"
        end

        if file.size > MAX_FILE_SIZE
          mb = (file.size.to_f / 1.megabyte).round(1)
          errors << "'#{name}': el archivo pesa #{mb} MB, el límite es #{MAX_FILE_SIZE / 1.megabyte} MB"
        end
      end

      errors
    end
  end
end
