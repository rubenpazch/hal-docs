export type CertificateStatus = 'valid' | 'expiring' | 'expired'

export interface DigitalCertificate {
  id: number
  alias_name: string
  issued_to: string | null
  serial_number: string | null
  subject_dn: string | null
  issuer_dn: string | null
  valid_from: string | null
  valid_until: string | null
  is_default: boolean
  status: CertificateStatus
  expired: boolean
  expires_soon: boolean
  has_file: boolean
  file_name: string | null
  created_at: string
}

export interface CertificatesResponse {
  certificates: DigitalCertificate[]
  meta: { total: number }
}

// ── Signature validation result (from FIRMA PERÚ) ──────────────────
export interface SignatureInfo {
  number: number
  signer: string
  status: string
  date: string
  format: string
  signatureAlgorithm: string
  rootInTsl: boolean
  serial: string
  notBeFore: string
  notAfter: string
  chain: string[]
  trustSigningTime: boolean
  indications: string[]
  informations: string[]
  warnings: string[]
  errors: string[]
  notes: string[]
  issuerDN: string
  subjectDN: string
}

export interface ValidationResult {
  available: boolean
  valid: boolean
  result_text: string
  signatures: SignatureInfo[]
  file: string
}
