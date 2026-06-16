import axios from 'axios'
import type { DocumentType, VirtualSubmission } from '@/types/document'

// Public axios instance — no auth token needed for Mesa Virtual
const publicApi = axios.create({ baseURL: '/api/v1/mesa_virtual' })

export interface SubmitTramitePayload {
  submitter_type: 'natural' | 'juridica'
  submitter_name: string
  submitter_document: string
  submitter_email: string
  submitter_phone?: string
  submitter_address?: string
  company_name?: string
  representative_name?: string
  document_type_id: number
  subject: string
  observations?: string
  folio_count?: number
  attachments?: File[]
}

export interface TimelineEvent {
  date: string
  status: string
  event: string
  from_area?: string | null
  area?: string | null
  notes?: string | null
}

export interface TrackingResult {
  tracking_number: string
  subject: string
  status: string
  document_type: string
  received_at: string
  review_notes?: string
  to_area?: string | null
  created_at: string
  timeline: TimelineEvent[]
}

export const mesaVirtualService = {
  getDocumentTypes: async (): Promise<DocumentType[]> => {
    const { data } = await publicApi.get<{ document_types: DocumentType[] }>('/document_types')
    return data.document_types
  },

  submit: async (payload: SubmitTramitePayload): Promise<{
    tracking_number: string
    submission: VirtualSubmission
    message: string
  }> => {
    const formData = new FormData()
    const { attachments, ...fields } = payload

    // Nest under submission[...] to match Rails strong params
    Object.entries(fields).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        formData.append(`submission[${key}]`, String(val))
      }
    })

    attachments?.forEach((file) => {
      formData.append('attachments[]', file)
    })

    const { data } = await publicApi.post('/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  track: async (params: { tracking_number?: string; document?: string }): Promise<TrackingResult[]> => {
    const { data } = await publicApi.get<{ submissions: TrackingResult[] }>('/track', { params })
    return data.submissions
  },
}
