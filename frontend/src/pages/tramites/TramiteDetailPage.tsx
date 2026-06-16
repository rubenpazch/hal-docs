import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  User,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Paperclip,
  FileText,
  Hash,
  AlertCircle,
  Eye,
  ExternalLink,
  X,
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '@/lib/api'
import type { AttachmentUrl, Document, DocumentPriority, DocumentStatus } from '@/types/document'
import styles from './TramiteDetailPage.module.css'

// ── Label maps ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<DocumentStatus, string> = {
  registrado: 'Registrado',
  en_proceso: 'En Proceso',
  derivado:   'Derivado',
  respondido: 'Respondido',
  archivado:  'Archivado',
  anulado:    'Anulado',
  devuelto:   'Devuelto',
  finalizado: 'Finalizado',
}

const STATUS_CLASS: Record<DocumentStatus, string> = {
  registrado: styles.statusRegistrado,
  en_proceso: styles.statusEnProceso,
  derivado:   styles.statusDerivado,
  respondido: styles.statusRespondido,
  archivado:  styles.statusArchivado,
  anulado:    styles.statusAnulado,
  devuelto:   styles.statusDevuelto,
  finalizado: styles.statusFinalizado,
}

const PRIORITY_LABEL: Record<DocumentPriority, string> = {
  baja:    'Baja',
  media:   'Media',
  alta:    'Alta',
  urgente: 'Urgente',
}

const PRIORITY_CLASS: Record<DocumentPriority, string> = {
  baja:    styles.priorityBaja,
  media:   styles.priorityMedia,
  alta:    styles.priorityAlta,
  urgente: styles.priorityUrgente,
}

// ── Helpers ────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
}

function formatDateShort(iso: string) {
  return format(parseISO(iso), 'dd MMM yyyy', { locale: es })
}

function dueDateState(iso: string): 'ok' | 'warning' | 'overdue' {
  const diff = differenceInDays(parseISO(iso), new Date())
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'warning'
  return 'ok'
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Skeleton ───────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className={styles.skeleton}>
      {[80, 60, 100, 40, 70].map((w, i) => (
        <div key={i} className={styles.skeletonLine} style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

// ── Field row ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  )
}

// ── PDF Preview Modal ─────────────────────────────────────────────────
function PdfPreviewModal({ attachment, onClose }: { attachment: AttachmentUrl; onClose: () => void }) {
  const isPdf = attachment.content_type === 'application/pdf'
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(isPdf)
  const [fetchError, setFetchError] = useState(false)

  // Fetch through the Vite proxy (authenticated axios) to avoid X-Frame-Options blocks.
  // Active Storage redirect URLs point directly to localhost:3000 which the browser
  // refuses to load in an iframe (sameorigin policy). Using a blob: URL sidesteps this.
  useEffect(() => {
    if (!isPdf) return
    let objectUrl: string

    api
      .get<Blob>(attachment.url, { responseType: 'blob', baseURL: '' })
      .then((res) => {
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
        setBlobUrl(objectUrl)
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [attachment.url, isPdf])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <FileText size={16} />
            <span>{attachment.filename}</span>
          </div>
          <div className={styles.modalActions}>
            <a
              href={blobUrl ?? attachment.url}
              target="_blank"
              rel="noreferrer"
              className={styles.modalActionBtn}
              title="Abrir en nueva pestaña"
            >
              <ExternalLink size={15} />
            </a>
            <button onClick={onClose} className={styles.modalCloseBtn} title="Cerrar">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {!isPdf ? (
            <div className={styles.previewUnsupported}>
              <FileText size={40} strokeWidth={1.2} />
              <p>Vista previa no disponible para este tipo de archivo.</p>
              <a href={attachment.url} target="_blank" rel="noreferrer" className={styles.downloadLink}>
                <ExternalLink size={14} /> Abrir archivo
              </a>
            </div>
          ) : loading ? (
            <div className={styles.previewUnsupported}>
              <div className={styles.pdfSpinner} />
              <p>Cargando documento…</p>
            </div>
          ) : fetchError ? (
            <div className={styles.previewUnsupported}>
              <AlertCircle size={36} strokeWidth={1.5} />
              <p>No se pudo cargar el documento.</p>
            </div>
          ) : (
            <iframe src={blobUrl!} className={styles.pdfFrame} title={attachment.filename} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────
export default function TramiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentUrl | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const res = await api.get<{ document: Document }>(`/documents/${id}`)
      return res.data.document
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PageHeader onBack={() => navigate(-1)} loading />
        <Skeleton />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <PageHeader onBack={() => navigate(-1)} />
        <div className={styles.errorState}>
          <AlertCircle size={36} strokeWidth={1.5} />
          <p>No se pudo cargar el trámite. Puede que haya sido eliminado o no tengas acceso.</p>
          <Link to="/tramites" className={styles.backLink}>← Volver a la lista</Link>
        </div>
      </div>
    )
  }

  const doc = data
  const initials = doc.created_by.full_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const dueDateStatus = doc.due_date ? dueDateState(doc.due_date) : null

  return (
    <div className={styles.page}>
      <PageHeader onBack={() => navigate(-1)} />

      {/* ── Header card ── */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.docMeta}>
            <Hash size={14} className={styles.hashIcon} />
            <span className={styles.docNumber}>{doc.document_number}</span>
            <span className={styles.docTypeTag}>{doc.document_type.name}</span>
          </div>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${PRIORITY_CLASS[doc.priority]}`}>
              {PRIORITY_LABEL[doc.priority]}
            </span>
            <span className={`${styles.badge} ${STATUS_CLASS[doc.status]}`}>
              {STATUS_LABEL[doc.status]}
            </span>
          </div>
        </div>
        <h1 className={styles.subject}>{doc.subject}</h1>
      </div>

      <div className={styles.grid}>
        {/* ── Left column ── */}
        <div className={styles.mainCol}>

          {/* Parties */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <User size={15} /> Partes
            </h2>
            <div className={styles.fieldGroup}>
              <Field label="Remitente">
                <User size={13} className={styles.fieldIcon} />{doc.sender}
              </Field>
              <Field label="Destinatario">
                <ArrowRight size={13} className={styles.fieldIcon} />{doc.recipient}
              </Field>
              {doc.area && (
                <Field label="Área">
                  <Building2 size={13} className={styles.fieldIcon} />{doc.area.name}
                </Field>
              )}
            </div>
          </section>

          {/* Dates */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Calendar size={15} /> Fechas
            </h2>
            <div className={styles.fieldGroup}>
              {doc.received_at && (
                <Field label="Recibido">
                  <Clock size={13} className={styles.fieldIcon} />{formatDate(doc.received_at)}
                </Field>
              )}
              <Field label="Registrado">
                <Clock size={13} className={styles.fieldIcon} />{formatDate(doc.created_at)}
              </Field>
              {doc.due_date && (
                <Field label="Fecha límite">
                  <span className={`${styles.dueDate} ${styles[`dueDate_${dueDateStatus}`]}`}>
                    <Calendar size={13} />
                    {dueDateStatus === 'overdue' && 'Vencido · '}
                    {dueDateStatus === 'warning' && 'Por vencer · '}
                    {formatDateShort(doc.due_date)}
                  </span>
                </Field>
              )}
            </div>
          </section>

          {/* Observations */}
          {doc.observations && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <FileText size={15} /> Observaciones
              </h2>
              <p className={styles.observations}>{doc.observations}</p>
            </section>
          )}
        </div>

        {/* ── Right column ── */}
        <div className={styles.sideCol}>

          {/* Registered by */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <User size={15} /> Registrado por
            </h2>
            <div className={styles.createdByRow}>
              <div className={styles.avatar}>{initials}</div>
              <div>
                <div className={styles.createdByName}>{doc.created_by.full_name}</div>
                <div className={styles.createdByEmail}>{doc.created_by.email}</div>
              </div>
            </div>
          </section>

          {/* Attachments */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Paperclip size={15} /> Adjuntos
              {doc.attachments_urls.length > 0 && (
                <span className={styles.attachmentCount}>{doc.attachments_urls.length}</span>
              )}
            </h2>
            {doc.attachments_urls.length === 0 ? (
              <p className={styles.emptyAttachments}>Sin archivos adjuntos</p>
            ) : (
              <ul className={styles.attachmentList}>
                {doc.attachments_urls.map((att) => (
                  <li key={att.id} className={styles.attachmentItem}>
                    <div className={styles.attachmentIcon}>
                      <FileText size={16} />
                    </div>
                    <div className={styles.attachmentInfo}>
                      <span className={styles.attachmentName}>{att.filename}</span>
                      <span className={styles.attachmentMeta}>
                        {att.content_type} · {fileSize(att.byte_size)}
                      </span>
                    </div>
                    <div className={styles.attachmentBtns}>
                      <button
                        className={styles.attBtn}
                        title="Vista previa"
                        onClick={() => setPreviewAttachment(att)}
                      >
                        <Eye size={14} />
                      </button>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.attBtn}
                        title="Abrir en nueva pestaña"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </div>

      {/* PDF preview modal */}
      {previewAttachment && (
        <PdfPreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  )
}

// ── PageHeader ─────────────────────────────────────────────────────────
function PageHeader({ onBack, loading }: { onBack: () => void; loading?: boolean }) {
  return (
    <div className={styles.pageHeader}>
      <button onClick={onBack} className={styles.backBtn} aria-label="Volver">
        <ArrowLeft size={17} />
      </button>
      <div>
        <h1 className={styles.pageTitle}>{loading ? 'Cargando…' : 'Detalle del Trámite'}</h1>
        <p className={styles.pageSubtitle}>
          <Link to="/tramites" className={styles.breadcrumb}>Trámites</Link>
          {' / '}
          {loading ? '…' : 'Detalle'}
        </p>
      </div>
    </div>
  )
}
