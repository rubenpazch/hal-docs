# Generates a CAdES-BES (CMS Advanced Electronic Signatures — Basic Electronic Signature)
# detached signature compatible with the ETSI EN 319 122 standard and validated by Firma Perú.
#
# Plain OpenSSL::PKCS7.sign only produces a basic CMS structure, which Firma Perú rejects as
# CMS_NOT_ETSI because the mandatory `signing-certificate-v2` signed attribute (RFC 5035) is
# missing. This service builds the PKCS7 SignedData ASN.1 structure manually so that attribute
# is always present.
#
# Usage:
#   result = DocumentSigningService.call(
#     file_data:    IO.binread(path),
#     p12_data:     IO.binread(cert_path),
#     password:     "mi_clave",
#     include_chain: true
#   )
#   result.success?       # => true
#   result.signed_data    # => DER-encoded CAdES-BES ContentInfo bytes
#   result.error          # => nil

class DocumentSigningService
  # OIDs ─────────────────────────────────────────────────────────────────────
  SHA256_OID          = "2.16.840.1.101.3.4.2.1"      # id-sha256
  SHA256_RSA_OID      = "1.2.840.113549.1.1.11"        # sha256WithRSAEncryption
  ECDSA_SHA256_OID    = "1.2.840.10045.4.3.2"          # ecdsa-with-SHA256
  ID_DATA_OID         = "1.2.840.113549.1.7.1"          # id-data
  SIGNED_DATA_OID     = "1.2.840.113549.1.7.2"          # id-signedData
  CONTENT_TYPE_OID    = "1.2.840.113549.1.9.3"          # id-aa-contentType
  MESSAGE_DIGEST_OID  = "1.2.840.113549.1.9.4"          # id-aa-messageDigest
  SIGNING_CERT_V2_OID = "1.2.840.113549.1.9.16.2.47"   # id-aa-signingCertificateV2

  Result = Struct.new(:success, :signed_data, :error, keyword_init: true) do
    def success? = success
  end

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

    Result.new(success: true, signed_data: cades_bes_sign(cert, key, ca), error: nil)

  rescue OpenSSL::PKCS12::PKCS12Error
    Result.new(success: false, signed_data: nil, error: "Contraseña incorrecta o archivo inválido.")
  rescue OpenSSL::PKey::PKeyError => e
    Result.new(success: false, signed_data: nil, error: "Error con la clave privada: #{e.message}")
  rescue StandardError => e
    Result.new(success: false, signed_data: nil, error: "Error al firmar: #{e.message}")
  end

  private

  # Produces a DER-encoded ContentInfo wrapping a detached CAdES-BES SignedData.
  def cades_bes_sign(cert, key, ca_certs)
    content_digest = OpenSSL::Digest::SHA256.digest(@file_data)
    cert_digest    = OpenSSL::Digest::SHA256.digest(cert.to_der)

    # signed_attrs is encoded as SET (tag 0x31) when computing the signature,
    # but embedded in SignerInfo with the [0] IMPLICIT tag (0xA0).
    signed_attrs = build_signed_attrs(content_digest, cert_digest)
    signature    = key.sign(OpenSSL::Digest::SHA256.new, signed_attrs.to_der)

    build_content_info(cert, ca_certs, signed_attrs, signature, key)
  end

  # The three mandatory CAdES signed attributes in DER-correct SET ordering.
  # ORDER: content-type (shortest) < message-digest < signing-certificate-v2 (longest)
  def build_signed_attrs(content_digest, cert_digest)
    OpenSSL::ASN1::Set([
      cms_attr(CONTENT_TYPE_OID,    OpenSSL::ASN1::ObjectId(ID_DATA_OID)),
      cms_attr(MESSAGE_DIGEST_OID,  OpenSSL::ASN1::OctetString(content_digest)),
      cms_attr(SIGNING_CERT_V2_OID, signing_cert_v2_value(cert_digest)),
    ])
  end

  # Wraps a value in a standard CMS Attribute: SEQUENCE { OID, SET { value } }
  def cms_attr(oid, value)
    OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::ObjectId(oid),
      OpenSSL::ASN1::Set([value]),
    ])
  end

  # SigningCertificateV2 (RFC 5035) — carries the SHA-256 fingerprint of the
  # signing certificate so verifiers can confirm the correct cert was used.
  #
  # SigningCertificateV2 ::= SEQUENCE {
  #   certs SEQUENCE OF ESSCertIDv2 }
  # ESSCertIDv2 ::= SEQUENCE {
  #   hashAlgorithm AlgorithmIdentifier,
  #   certHash      OCTET STRING }
  def signing_cert_v2_value(cert_digest)
    ess_cert_id_v2 = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::Sequence([OpenSSL::ASN1::ObjectId(SHA256_OID)]),  # hashAlgorithm
      OpenSSL::ASN1::OctetString(cert_digest),                          # certHash
    ])
    OpenSSL::ASN1::Sequence([OpenSSL::ASN1::Sequence([ess_cert_id_v2])]) # SigningCertificateV2 { certs }
  end

  def build_content_info(cert, ca_certs, signed_attrs, signature, key)
    # signedAttrs in SignerInfo uses [0] IMPLICIT tag (0xA0) instead of SET (0x31)
    signed_attrs_implicit = OpenSSL::ASN1::ASN1Data.new(signed_attrs.value, 0, :CONTEXT_SPECIFIC)

    signer_info = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::Integer(1),            # version = 1 (IssuerAndSerialNumber)
      issuer_and_serial(cert),              # sid
      sha256_alg_id,                        # digestAlgorithm
      signed_attrs_implicit,                # signedAttrs [0] IMPLICIT
      signature_alg_id(key),               # signatureAlgorithm
      OpenSSL::ASN1::OctetString(signature), # signature
    ])

    all_certs    = ([cert] + ca_certs).uniq
    certs_tagged = OpenSSL::ASN1::ASN1Data.new(
      all_certs.map { |c| OpenSSL::ASN1.decode(c.to_der) },
      0, :CONTEXT_SPECIFIC
    )

    signed_data = OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::Integer(1),                                          # version
      OpenSSL::ASN1::Set([sha256_alg_id]),                                # digestAlgorithms
      OpenSSL::ASN1::Sequence([OpenSSL::ASN1::ObjectId(ID_DATA_OID)]),    # encapContentInfo (detached)
      certs_tagged,                                                        # certificates [0]
      OpenSSL::ASN1::Set([signer_info]),                                   # signerInfos
    ])

    OpenSSL::ASN1::Sequence([
      OpenSSL::ASN1::ObjectId(SIGNED_DATA_OID),
      OpenSSL::ASN1::ASN1Data.new([signed_data], 0, :CONTEXT_SPECIFIC),
    ]).to_der
  end

  def issuer_and_serial(cert)
    OpenSSL::ASN1::Sequence([cert.issuer, OpenSSL::ASN1::Integer(cert.serial)])
  end

  # SHA-256 AlgorithmIdentifier with explicit NULL parameters for CMS compatibility.
  def sha256_alg_id
    OpenSSL::ASN1::Sequence([OpenSSL::ASN1::ObjectId(SHA256_OID), OpenSSL::ASN1::Null(nil)])
  end

  def signature_alg_id(key)
    if key.is_a?(OpenSSL::PKey::EC)
      OpenSSL::ASN1::Sequence([OpenSSL::ASN1::ObjectId(ECDSA_SHA256_OID)])
    else
      OpenSSL::ASN1::Sequence([OpenSSL::ASN1::ObjectId(SHA256_RSA_OID), OpenSSL::ASN1::Null(nil)])
    end
  end
end

