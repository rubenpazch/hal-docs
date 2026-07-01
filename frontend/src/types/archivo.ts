export type ArchivoEstado = 'borrador' | 'firmado'

export interface ArchivoFile {
  filename: string
  content_type: string
  byte_size: number
  url: string
}

export interface Archivo {
  id: number
  nombre: string
  estado: ArchivoEstado
  firmado_at: string | null
  signature_page: number | null
  signature_x: number | null
  signature_y: number | null
  created_at: string
  updated_at: string
  document_type: { id: number; name: string; code: string }
  uploader: { id: number; nombre: string; apellido: string; full_name: string }
  tramites_count: number
  file: ArchivoFile | null
}

export interface ArchivosMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ArchivosResponse {
  archivos: Archivo[]
  meta: ArchivosMeta
}

// Lightweight version embedded in Document responses
export interface ArchivoLinked {
  id: number
  nombre: string
  estado: ArchivoEstado
  firmado_at: string | null
  document_type_name: string
  uploader_name: string
  file: ArchivoFile | null
}

// Bundle (group of archivos)
export interface BundleArchivo {
  id: number
  nombre: string
  estado: ArchivoEstado
  firmado_at: string | null
  document_type: { id: number; name: string; code: string }
  file: ArchivoFile | null
}

export interface DocumentBundle {
  id: number
  name: string
  description: string | null
  archivos_count: number
  created_at: string
  updated_at: string
  creator: { id: number; nombre: string; apellido: string; full_name: string }
  archivos: BundleArchivo[]
}

export interface BundlesResponse {
  bundles: DocumentBundle[]
}
