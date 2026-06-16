// ── Document-related types ─────────────────────────────────────────────

export type DocumentPriority = 'baja' | 'media' | 'alta' | 'urgente'
export type DocumentStatus =
  | 'registrado'
  | 'en_proceso'
  | 'derivado'
  | 'respondido'
  | 'archivado'
  | 'anulado'
  | 'devuelto'
  | 'finalizado'

export type DocumentDirection = 'entrada' | 'interno' | 'salida'
export type DocumentAccessLevel = 'publico' | 'interno_area' | 'reservado' | 'confidencial'

export type VirtualSubmissionStatus =
  | 'registrado'
  | 'en_revision'
  | 'observado'
  | 'derivado'
  | 'finalizado'

export type SubmitterType = 'natural' | 'juridica'

export interface DocumentType {
  id: number
  name: string
  code: string
  description?: string
  is_active: boolean
  retention_years?: number
}

export interface DocumentArea {
  id: number
  name: string
  area_type: string
}

export interface DocumentUser {
  id: number
  full_name: string
  email: string
  role: string
}

export interface AttachmentUrl {
  id: number
  filename: string
  content_type: string
  byte_size: number
  url: string
}

export interface DocumentFlow {
  id: number
  action: string
  from_status?: string
  to_status?: string
  observations?: string
  performed_at: string
  created_at: string
  performed_by: DocumentUser
  from_area?: DocumentArea
  to_area?: DocumentArea
}

export interface Document {
  id: number
  document_number: string
  subject: string
  sender: string
  recipient: string
  priority: DocumentPriority
  status: DocumentStatus
  direction: DocumentDirection
  access_level: DocumentAccessLevel
  observations?: string
  due_date?: string
  received_at?: string
  outside_hours?: boolean
  folio_count?: number
  reference_number?: string
  requires_response?: boolean
  author_initials?: string
  attachment_checksum?: string
  created_at: string
  updated_at: string
  document_type: DocumentType
  area?: DocumentArea
  created_by: DocumentUser
  attachments_urls: AttachmentUrl[]
  document_flows?: DocumentFlow[]
}

export interface TimelineEvent {
  date: string
  action: string
  from_status?: string | null
  status: string
  event: string
  from_area?: string | null
  area?: string | null
  notes?: string | null
  performed_by?: string | null
}

export interface VirtualSubmission {
  id: number
  tracking_number: string
  submitter_type: SubmitterType
  submitter_name: string
  submitter_document: string
  submitter_email: string
  submitter_phone?: string
  submitter_address?: string
  company_name?: string
  representative_name?: string
  subject: string
  observations?: string
  folio_count?: number
  status: VirtualSubmissionStatus
  review_notes?: string
  received_at: string
  created_at: string
  document_type: DocumentType
  to_area?: { id: number; name: string } | null
  attachments_urls?: AttachmentUrl[]
  timeline?: TimelineEvent[]
}

export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  total_pages: number
  from: number
  to: number
}

export interface DocumentsResponse {
  documents: Document[]
  meta: PaginationMeta
}
