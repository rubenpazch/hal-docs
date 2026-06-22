module VirtualSubmissions
  # Generates the correct download URL for a VirtualSubmission attachment.
  #
  # The URL format depends on the Active Storage backend configured per environment:
  #
  #   Development / test  (Disk service)
  #     Files live under storage/ and are not publicly accessible.
  #     Returns a relative path served by the Active Storage redirect controller:
  #     /rails/active_storage/blobs/redirect/<signed_id>/filename
  #
  #   Production  (Amazon S3 service)
  #     Returns a direct time-limited presigned S3 URL, bypassing the Rails
  #     redirect controller for lower latency and reduced server load:
  #     https://<bucket>.s3.<region>.amazonaws.com/...?X-Amz-Expires=3600&...
  #     IAM task role credentials are used automatically — no explicit keys needed.
  #
  # Usage:
  #   url = VirtualSubmissions::AttachmentUrlService.url_for(attachment)
  class AttachmentUrlService
    PRESIGNED_EXPIRY = 1.hour

    def self.url_for(attachment)
      new(attachment).url
    end

    def initialize(attachment)
      @attachment = attachment
    end

    def url
      if Rails.env.production?
        # Direct presigned S3 URL.
        # Active Storage calls the S3 SDK to sign the object URL with a short
        # expiry. The ECS task IAM role provides the necessary credentials.
        @attachment.blob.url(expires_in: PRESIGNED_EXPIRY, disposition: :inline)
      else
        # Local Disk service: files must be served through the Active Storage
        # redirect controller — they are not accessible as static files.
        routes.rails_blob_url(@attachment, only_path: true)
      end
    end

    private

    def routes
      Rails.application.routes.url_helpers
    end
  end
end
