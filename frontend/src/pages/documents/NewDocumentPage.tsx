import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  Loader2,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import styles from './NewDocumentPage.module.css'

// ── Types ──────────────────────────────────────────────────────────────
interface DocumentType {
  id: number
  name: string
  code: string
}

interface Area {
  id: number
  name: string
}

// ── Schema ─────────────────────────────────────────────────────────────
const schema = z.object({
  document_type_id: z.string().min(1, 'Selecciona un tipo de documento'),
  priority: z.enum(['baja', 'media', 'alta', 'urgente']),
  subject: z.string().min(3, 'El asunto debe tener al menos 3 caracteres'),
  sender: z.string().min(1, 'Requerido'),
  recipient: z.string().min(1, 'Requerido'),
  area_id: z.string().min(1, 'Selecciona un área responsable'),
  observations: z.string().optional(),
  due_date: z.string().optional(),
})

type DocumentForm = z.infer<typeof schema>

// ── Helpers ────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

// ── Component ──────────────────────────────────────────────────────────
export default function NewDocumentPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DocumentForm>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'media' },
  })

  // Fetch document types
  const { data: documentTypesData } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await api.get<{ document_types: DocumentType[] }>('/document_types')
      return res.data.document_types
    },
  })

  // Fetch areas
  const { data: areasData } = useQuery({
    queryKey: ['areas-list'],
    queryFn: async () => {
      const res = await api.get<{ areas: Area[] }>('/areas')
      return res.data.areas
    },
  })

  // Dropzone
  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      const fresh = accepted.filter((f) => !existing.has(f.name))
      return [...prev, ...fresh]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024, // 20 MB
    onDropRejected: (rejections) => {
      rejections.forEach((r) =>
        toast.error(`${r.file.name}: ${r.errors[0]?.message ?? 'Archivo rechazado'}`)
      )
    },
  })

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  // Submit
  const onSubmit = async (data: DocumentForm) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()

      // Append document fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          formData.append(`document[${key}]`, String(value))
        }
      })

      // Append files
      files.forEach((file) => {
        formData.append('attachments[]', file)
      })

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Documento registrado exitosamente')
      reset()
      setFiles([])
      navigate('/tramites')
    } catch (err: unknown) {
      const errors = (err as { response?: { data?: { errors?: string[] } } })
        ?.response?.data?.errors
      toast.error(errors?.[0] ?? 'Ocurrió un error al registrar el documento')
    } finally {
      setIsSubmitting(false)
    }
  }

  const documentTypes = documentTypesData ?? []
  const areas = areasData ?? []

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          title="Volver"
        >
          <ArrowLeft size={16} />
        </button>
        <div className={styles.pageHeaderText}>
          <h1>Registrar Nuevo Documento</h1>
          <p>Completa los datos del documento para su registro en el sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.card}>
          {/* Auto-generated number preview */}
          <div className={styles.cardSection}>
            <div className={styles.docNumberBadge}>
              <Hash size={13} />
              Nro. de documento asignado automáticamente al registrar
            </div>

            <p className={styles.sectionTitle}>Clasificación</p>
            <div className={styles.formGrid}>
              {/* Tipo de Documento */}
              <div className={styles.formField}>
                <label>
                  Tipo de Documento <span>*</span>
                </label>
                <select
                  {...register('document_type_id')}
                  className={errors.document_type_id ? styles.inputError : ''}
                >
                  <option value="">Seleccionar...</option>
                  {documentTypes.map((dt) => (
                    <option key={dt.id} value={String(dt.id)}>
                      {dt.name}
                    </option>
                  ))}
                </select>
                {errors.document_type_id && (
                  <span className={styles.fieldError}>{errors.document_type_id.message}</span>
                )}
              </div>

              {/* Prioridad */}
              <div className={styles.formField}>
                <label>
                  Prioridad <span>*</span>
                </label>
                <select {...register('priority')}>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Details section */}
          <div className={styles.cardSection}>
            <p className={styles.sectionTitle}>Detalle del Documento</p>
            <div className={styles.formGrid}>
              {/* Asunto */}
              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label>
                  Asunto <span>*</span>
                </label>
                <input
                  {...register('subject')}
                  placeholder="Descripción breve del documento"
                  className={errors.subject ? styles.inputError : ''}
                />
                {errors.subject && (
                  <span className={styles.fieldError}>{errors.subject.message}</span>
                )}
              </div>

              {/* Remitente */}
              <div className={styles.formField}>
                <label>
                  Remitente <span>*</span>
                </label>
                <input
                  {...register('sender')}
                  placeholder="Nombre o razón social"
                  className={errors.sender ? styles.inputError : ''}
                />
                {errors.sender && (
                  <span className={styles.fieldError}>{errors.sender.message}</span>
                )}
              </div>

              {/* Destinatario */}
              <div className={styles.formField}>
                <label>
                  Destinatario <span>*</span>
                </label>
                <input
                  {...register('recipient')}
                  placeholder="Nombre o cargo destinatario"
                  className={errors.recipient ? styles.inputError : ''}
                />
                {errors.recipient && (
                  <span className={styles.fieldError}>{errors.recipient.message}</span>
                )}
              </div>

              {/* Área Responsable */}
              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label>
                  Área Responsable <span>*</span>
                </label>
                <select
                  {...register('area_id')}
                  className={errors.area_id ? styles.inputError : ''}
                >
                  <option value="">Seleccionar área...</option>
                  {areas.map((area) => (
                    <option key={area.id} value={String(area.id)}>
                      {area.name}
                    </option>
                  ))}
                </select>
                {errors.area_id && (
                  <span className={styles.fieldError}>{errors.area_id.message}</span>
                )}
              </div>

              {/* Fecha límite */}
              <div className={styles.formField}>
                <label>Fecha límite de atención</label>
                <input type="date" {...register('due_date')} />
              </div>

              {/* Observaciones */}
              <div className={`${styles.formField} ${styles.formFieldFull}`}>
                <label>Observaciones</label>
                <textarea
                  {...register('observations')}
                  placeholder="Indicaciones adicionales, referencias, notas..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Attachments section */}
          <div className={styles.cardSection}>
            <p className={styles.sectionTitle}>Archivos Adjuntos</p>

            <div
              {...getRootProps({
                className: `${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`,
              })}
            >
              <input {...getInputProps()} />
              <Upload size={28} className={styles.dropzoneIcon} />
              <p className={styles.dropzoneTitle}>
                {isDragActive ? 'Suelta los archivos aquí...' : 'Click para adjuntar archivos'}
              </p>
              <p className={styles.dropzoneSubtitle}>
                PDF, Word, Excel, Imágenes — máx. 20 MB por archivo
              </p>
            </div>

            {files.length > 0 && (
              <div className={styles.fileList}>
                {files.map((file) => (
                  <div key={file.name} className={styles.fileItem}>
                    <FileText size={16} className={styles.fileIcon} />
                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{formatBytes(file.size)}</div>
                    </div>
                    <button
                      type="button"
                      className={styles.fileRemove}
                      onClick={() => removeFile(file.name)}
                      title="Eliminar archivo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.cardFooter}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <FileText size={15} />
                  Registrar Documento
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
