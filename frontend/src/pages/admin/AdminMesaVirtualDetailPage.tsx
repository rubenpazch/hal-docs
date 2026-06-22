import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Inbox,
  User,
  Building2,
  FileText,
  Paperclip,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Upload,
  X,
} from 'lucide-react'
import { useRef } from 'react'
import api from '@/lib/api'
import type { VirtualSubmission, VirtualSubmissionStatus } from '@/types/document'
import type { Area } from '@/types/area'
import styles from './AdminMesaVirtualDetailPage.module.css'

// ─── constants ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<VirtualSubmissionStatus, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
}

const STATUS_NEXT: Record<string, { value: string; label: string; icon: React.ReactNode; variant: string }[]> = {
  registrado: [
    { value: 'en_revision', label: 'Poner en revisión', icon: <RefreshCw size={15} />, variant: 'default' },
  ],
  en_revision: [
    { value: 'observado',   label: 'Observar',          icon: <AlertCircle size={15} />, variant: 'warn' },
    { value: 'derivado',    label: 'Derivar a área',    icon: <ChevronRight size={15} />, variant: 'default' },
    { value: 'finalizado',  label: 'Finalizar',         icon: <CheckCircle size={15} />, variant: 'success' },
  ],
  observado: [
    { value: 'en_revision', label: 'Retomar revisión',  icon: <RefreshCw size={15} />, variant: 'default' },
  ],
  derivado: [
    { value: 'derivado',   label: 'Derivar a otra área', icon: <ChevronRight size={15} />, variant: 'default' },
    { value: 'finalizado', label: 'Finalizar',            icon: <CheckCircle size={15} />, variant: 'success' },
  ],
  finalizado: [],
}

function fmt(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// ─── component ───────────────────────────────────────────────────────────────
export default function AdminMesaVirtualDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const [confirmModal, setConfirmModal] = useState<{
    nextStatus: string
    label: string
    variant: string
  } | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [toAreaId, setToAreaId] = useState<number | ''>('')
  const [areaError, setAreaError] = useState('')
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const closeModal = () => {
    setConfirmModal(null)
    setReviewNotes('')
    setToAreaId('')
    setAreaError('')
    setAttachmentFiles([])
  }

  const { data: submission, isLoading, isError } = useQuery<VirtualSubmission>({
    queryKey: ['admin-virtual-submission', id],
    queryFn: async () => {
      const { data } = await api.get(`/admin/virtual_submissions/${id}`)
      return data.submission
    },
    enabled: !!id,
  })

  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ['areas-list'],
    queryFn: async () => {
      const { data } = await api.get('/areas', { params: { per_page: 100 } })
      return data.areas ?? []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ status, notes, areaId, files }: {
      status: string; notes: string; areaId?: number; files: File[]
    }) => {
      if (files.length > 0) {
        const fd = new FormData()
        fd.append('status', status)
        if (notes) fd.append('review_notes', notes)
        if (areaId) fd.append('to_area_id', String(areaId))
        files.forEach((f) => fd.append('attachments[]', f))
        return api.patch(`/admin/virtual_submissions/${id}/update_status`, fd)
      }
      return api.patch(`/admin/virtual_submissions/${id}/update_status`, {
        status,
        review_notes: notes,
        to_area_id: areaId,
      })
    },
    onSuccess: () => {
      toast.success('Estado actualizado correctamente')
      qc.invalidateQueries({ queryKey: ['admin-virtual-submission', id] })
      qc.invalidateQueries({ queryKey: ['admin-virtual-submissions'] })
      closeModal()
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  })

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <RefreshCw size={22} className={styles.spin} />
        <span>Cargando trámite…</span>
      </div>
    )
  }

  if (isError || !submission) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={40} />
        <p>No se pudo cargar el trámite</p>
        <Link to="/admin/mesa-virtual" className={styles.backLink}>
          Volver al listado
        </Link>
      </div>
    )
  }

  const nextActions = STATUS_NEXT[submission.status] ?? []

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb header ──────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link to="/admin/mesa-virtual" className={styles.breadcrumbLink}>
            <ArrowLeft size={15} />
            Mesa Virtual
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{submission.tracking_number}</span>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* ── Left column ──────────────────────────────────────────── */}
        <div className={styles.mainCol}>

          {/* Remitente */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <User size={16} />
              Datos del remitente
            </h2>
            <div className={styles.grid}>
              <InfoRow label="Tipo" value={submission.submitter_type === 'natural' ? 'Persona Natural' : 'Persona Jurídica'} />
              <InfoRow label="Nombre completo" value={submission.submitter_name} />
              <InfoRow label="DNI / RUC" value={submission.submitter_document} />
              <InfoRow label="Correo electrónico" value={submission.submitter_email} />
              {submission.submitter_phone && <InfoRow label="Teléfono" value={submission.submitter_phone} />}
              {submission.submitter_address && <InfoRow label="Dirección" value={submission.submitter_address} />}
              {submission.submitter_type === 'juridica' && (
                <>
                  <InfoRow label="Razón social" value={submission.company_name ?? '—'} />
                  <InfoRow label="Representante" value={submission.representative_name ?? '—'} />
                </>
              )}
            </div>
          </section>

          {/* Documento */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FileText size={16} />
              Datos del documento
            </h2>
            <div className={styles.grid}>
              <InfoRow label="Número de trámite" value={submission.tracking_number} mono />
              <InfoRow label="Tipo de documento" value={submission.document_type.name} />
              <InfoRow label="Asunto" value={submission.subject} full />
              {submission.observations && <InfoRow label="Observaciones" value={submission.observations} full />}
              {submission.folio_count != null && <InfoRow label="Folios" value={String(submission.folio_count)} />}
              <InfoRow label="Fecha de recepción" value={fmt(submission.received_at)} />
              {submission.to_area && <InfoRow label="Área asignada" value={submission.to_area.name} />}
            </div>
          </section>

          {/* Review notes */}
          {submission.review_notes && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <AlertCircle size={16} />
                Notas de revisión
              </h2>
              <p className={styles.reviewText}>{submission.review_notes}</p>
            </section>
          )}

          {/* Attachments */}
          {(submission.attachments_urls ?? []).length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <Paperclip size={16} />
                Archivos adjuntos ({submission.attachments_urls!.length})
              </h2>
              <div className={styles.attachmentList}>
                {submission.attachments_urls!.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachment}
                  >
                    <FileText size={18} className={styles.attachIcon} />
                    <div className={styles.attachMeta}>
                      <span className={styles.attachName}>{att.filename}</span>
                      <span className={styles.attachSize}>{fmtBytes(att.byte_size)}</span>
                    </div>
                    <ExternalLink size={14} className={styles.attachExternal} />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────── */}
        <aside className={styles.sideCol}>

          {/* Actions */}
          {nextActions.length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <Inbox size={16} />
                Cambiar estado
              </h2>
              <div className={styles.actionBtns}>
                {nextActions.map((a) => (
                  <button
                    key={a.value}
                    className={styles.actionBtn}
                    data-variant={a.variant}
                    onClick={() => {
                      setConfirmModal({ nextStatus: a.value, label: a.label, variant: a.variant })
                      setReviewNotes('')
                      setToAreaId('')
                      setAreaError('')
                      setAttachmentFiles([])
                    }}
                  >
                    {a.icon}
                    {a.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Timeline */}
          {(submission.timeline ?? []).length > 0 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <Clock size={16} />
                Historial
              </h2>
              <ol className={styles.timeline}>
                {[...(submission.timeline ?? [])].reverse().map((ev, i) => (
                  <li key={i} className={styles.timelineItem}>
                    <div className={styles.timelineDot} data-status={ev.status} />
                    <div className={styles.timelineContent}>
                      <span className={styles.timelineAction}>{STATUS_LABEL[ev.status as VirtualSubmissionStatus] ?? ev.status}</span>
                      {ev.area && (
                        <span className={styles.timelineArea}>
                          <Building2 size={11} /> {ev.area}
                        </span>
                      )}
                      {ev.notes && <span className={styles.timelineNotes}>{ev.notes}</span>}
                      <span className={styles.timelineDate}>{fmt(ev.date)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

        </aside>
      </div>

      {/* ── Confirmation modal ─────────────────────────────────────── */}
      {confirmModal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{confirmModal.label}</h3>
            <p className={styles.modalDesc}>
              Trámite: <code>{submission.tracking_number}</code>
            </p>

            {confirmModal.nextStatus === 'derivado' && (
              <div className={styles.formField}>
                <label>Área destinataria (*)</label>
                <select
                  value={toAreaId}
                  onChange={(e) => { setToAreaId(Number(e.target.value)); setAreaError('') }}
                  className={areaError ? styles.selectError : ''}
                >
                  <option value="">Seleccione un área…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {areaError && <span className={styles.fieldError}>{areaError}</span>}
              </div>
            )}

            <div className={styles.formField}>
              <label>Notas / motivo (opcional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Observación o nota para el ciudadano…"
              />
            </div>

            {/* Optional supporting file */}
            <div className={styles.formField}>
              <label>Archivo de sustento (opcional · PDF · máx. 10 MB)</label>
              {attachmentFiles.length === 0 ? (
                <button
                  type="button"
                  className={styles.fileDropzone}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} />
                  Adjuntar archivo
                </button>
              ) : (
                <div className={styles.attachPreview}>
                  {attachmentFiles.map((f, i) => (
                    <div key={i} className={styles.attachPreviewItem}>
                      <FileText size={14} />
                      <span>{f.name}</span>
                      <button
                        type="button"
                        className={styles.attachRemove}
                        onClick={() => setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className={styles.fileDropzone}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={14} /> Agregar otro
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setAttachmentFiles((prev) => [...prev, f])
                  e.target.value = ''
                }}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalConfirm}
                data-variant={confirmModal.variant}
                disabled={updateMutation.isPending}
                onClick={() => {
                  if (confirmModal.nextStatus === 'derivado' && !toAreaId) {
                    setAreaError('Debe seleccionar el área destinataria')
                    return
                  }
                  updateMutation.mutate({
                    status: confirmModal.nextStatus,
                    notes: reviewNotes,
                    areaId: toAreaId ? Number(toAreaId) : undefined,
                    files: attachmentFiles,
                  })
                }}
              >
                {updateMutation.isPending ? 'Guardando…' : 'Confirmar'}
              </button>
              <button className={styles.modalCancel} onClick={closeModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.badge} data-status={status}>
      {STATUS_LABEL[status as VirtualSubmissionStatus] ?? status}
    </span>
  )
}

function InfoRow({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={styles.infoRow} data-full={full ? 'true' : undefined}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={mono ? styles.infoMono : styles.infoValue}>{value}</span>
    </div>
  )
}
