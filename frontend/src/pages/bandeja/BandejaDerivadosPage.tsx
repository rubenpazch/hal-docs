import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Inbox, Search, RefreshCw, Eye, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, Building2, Share2,
  List, X, CalendarDays, MapPin, ArrowRight,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import type { VirtualSubmission, PaginationMeta, TimelineEvent } from '@/types/document'
import styles from './BandejaDerivadosPage.module.css'

interface Area {
  id: number
  name: string
}

interface Response {
  submissions: VirtualSubmission[]
  meta: PaginationMeta
}

const STATUS_LABEL: Record<string, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
}

const STATUS_COLOR: Record<string, string> = {
  registrado:  'blue',
  en_revision: 'orange',
  observado:   'red',
  derivado:    'purple',
  finalizado:  'green',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

function formatDateFull(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

// ── Timeline Drawer ────────────────────────────────────────────────────
function TimelineDrawer({
  submission,
  onClose,
}: {
  submission: VirtualSubmission
  onClose: () => void
}) {
  const timeline = submission.timeline ?? []
  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderLeft}>
            <List size={18} />
            <div>
              <p className={styles.drawerLabel}>Seguimiento del trámite</p>
              <code className={styles.drawerTracking}>{submission.tracking_number}</code>
            </div>
          </div>
          <button className={styles.drawerClose} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.drawerSummary}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Tipo:</span>
            <span>{submission.document_type?.name ?? '—'}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Asunto:</span>
            <span>{submission.subject}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Estado:</span>
            <span className={styles.badge} data-status={submission.status}>
              {STATUS_LABEL[submission.status] ?? submission.status}
            </span>
          </div>
          {submission.to_area && (
            <div className={styles.summaryRow}>
              <Building2 size={13} />
              <span>{submission.to_area.name}</span>
            </div>
          )}
        </div>

        <div className={styles.drawerBody}>
          <h3 className={styles.timelineTitle}>Historial de eventos</h3>
          {timeline.length === 0 ? (
            <p className={styles.timelineEmpty}>Sin eventos registrados aún.</p>
          ) : (
            <ol className={styles.timeline}>
              {timeline.map((event: TimelineEvent, idx: number) => (
                <li key={idx} className={styles.timelineItem} data-last={idx === timeline.length - 1}>
                  <div className={styles.timelineDot} data-color={STATUS_COLOR[event.status] ?? 'blue'} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineMeta}>
                      <CalendarDays size={12} />
                      <time className={styles.timelineDate}>{formatDateFull(event.date)}</time>
                    </div>
                    <p className={styles.timelineEvent}>{event.event}</p>
                    {event.from_area && (
                      <div className={styles.timelineArea} data-variant="from">
                        <MapPin size={12} />
                        <span>Desde: {event.from_area}</span>
                      </div>
                    )}
                    {event.area && (
                      <div className={styles.timelineArea}>
                        <MapPin size={12} />
                        <span>Hacia: {event.area}</span>
                      </div>
                    )}
                    {event.notes && (
                      <div className={styles.timelineNotes}>
                        <ArrowRight size={11} />
                        <span>{event.notes}</span>
                      </div>
                    )}
                    <span
                      className={styles.timelineBadge}
                      data-color={STATUS_COLOR[event.status] ?? 'blue'}
                    >
                      {STATUS_LABEL[event.status] ?? event.status}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  )
}

export default function BandejaDerivadosPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<VirtualSubmission | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [timelineSubmission, setTimelineSubmission] = useState<VirtualSubmission | null>(null)
  const [reDerivId, setReDerivId] = useState<number | null>(null)
  const [reDerivAreaId, setReDerivAreaId] = useState<string>('')
  const [reDerivNotes, setReDerivNotes] = useState('')

  const { data: areasData } = useQuery<{ areas: Area[] }>({
    queryKey: ['areas-list'],
    queryFn: async () => {
      const { data } = await api.get('/areas', { params: { per_page: 100 } })
      return data
    },
  })

  const areas = (areasData?.areas ?? []).filter((a) => a.id !== user?.area_id)

  const { data, isLoading } = useQuery<Response>({
    queryKey: ['bandeja-derivados', search, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 20 }
      if (search) params.q = search
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/admin/bandeja/virtual_submissions', { params })
      return data
    },
  })

  const reDerivMutation = useMutation({
    mutationFn: ({ id, toAreaId, reviewNotes }: { id: number; toAreaId: number; reviewNotes: string }) =>
      api.patch(`/admin/virtual_submissions/${id}/update_status`, {
        status: 'derivado',
        to_area_id: toAreaId,
        review_notes: reviewNotes,
      }),
    onSuccess: (_, { id }) => {
      toast.success('Trámite re-derivado correctamente')
      qc.invalidateQueries({ queryKey: ['bandeja-derivados'] })
      setReDerivId(null)
      setReDerivAreaId('')
      setReDerivNotes('')
      if (selected?.id === id) setSelected(null)
    },
    onError: () => toast.error('No se pudo re-derivar el trámite'),
  })

  const finalizarMutation = useMutation({
    mutationFn: ({ id, reviewNotes }: { id: number; reviewNotes: string }) =>
      api.patch(`/admin/virtual_submissions/${id}/update_status`, {
        status: 'finalizado',
        review_notes: reviewNotes,
      }),
    onSuccess: (_, { id }) => {
      toast.success('Trámite finalizado correctamente')
      qc.invalidateQueries({ queryKey: ['bandeja-derivados'] })
      setConfirmId(null)
      setNotes('')
      if (selected?.id === id) setSelected(null)
    },
    onError: () => toast.error('No se pudo finalizar el trámite'),
  })

  const submissions = data?.submissions ?? []
  const meta = data?.meta

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Building2 size={22} />
          <div>
            <h1 className={styles.title}>Trámites Derivados a mi Área</h1>
            <p className={styles.subtitle}>
              Solicitudes de la Mesa de Partes Virtual asignadas a{' '}
              <strong>{user?.area ?? 'tu área'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por número de trámite, remitente, asunto…"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className={styles.statusSelect}
        >
          <option value="">Todos los estados</option>
          <option value="derivado">Derivado</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className={styles.body} data-split={selected ? 'true' : 'false'}>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={styles.tableWrapper}>
            {isLoading ? (
              <div className={styles.empty}>
                <RefreshCw size={20} className={styles.spin} /> Cargando…
              </div>
            ) : submissions.length === 0 ? (
              <div className={styles.empty}>
                <Inbox size={40} />
                <p>No hay trámites derivados a tu área.</p>
                <span>Cuando Mesa de Partes derive un trámite a tu área aparecerá aquí.</span>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nro. Trámite</th>
                    <th>Tipo</th>
                    <th>Remitente</th>
                    <th>Asunto</th>
                    <th>Estado</th>
                    <th>Recibido</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr
                      key={s.id}
                      className={selected?.id === s.id ? styles.rowSelected : ''}
                      onClick={() => setSelected(s)}
                    >
                      <td>
                        <code className={styles.trackingCode}>{s.tracking_number}</code>
                      </td>
                      <td>{s.document_type?.name ?? '—'}</td>
                      <td>
                        <div className={styles.submitterName}>{s.submitter_name}</div>
                        <div className={styles.submitterDoc}>{s.submitter_document}</div>
                      </td>
                      <td className={styles.subjectCell}>{s.subject}</td>
                      <td>
                        <span
                          className={styles.badge}
                          data-status={s.status}
                        >
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{formatDate(s.received_at)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.viewBtn}
                            title="Ver detalle"
                            onClick={(e) => { e.stopPropagation(); setSelected(s) }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className={styles.timelineBtn}
                            title="Ver seguimiento"
                            onClick={(e) => { e.stopPropagation(); setTimelineSubmission(s) }}
                          >
                            <List size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {meta && meta.total_pages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={15} /> Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {meta.current_page} de {meta.total_pages} · {meta.total} trámites
              </span>
              <button className={styles.pageBtn} disabled={page === meta.total_pages} onClick={() => setPage((p) => p + 1)}>
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <span className={styles.detailTracking}>{selected.tracking_number}</span>
              <button className={styles.closeBtn} onClick={() => setSelected(null)}>
                <XCircle size={18} />
              </button>
            </div>

            <div className={styles.detailBody}>
              <span className={styles.badge} data-status={selected.status}>
                {STATUS_LABEL[selected.status] ?? selected.status}
              </span>

              <section className={styles.detailSection}>
                <h3>Datos del remitente</h3>
                <Row label="Nombre" value={selected.submitter_name} />
                <Row label="Documento" value={selected.submitter_document} />
                <Row label="Correo" value={selected.submitter_email} />
                {selected.submitter_phone && <Row label="Teléfono" value={selected.submitter_phone} />}
              </section>

              <section className={styles.detailSection}>
                <h3>Datos del documento</h3>
                <Row label="Tipo" value={selected.document_type?.name ?? '—'} />
                <Row label="Asunto" value={selected.subject} />
                {selected.observations && <Row label="Observaciones" value={selected.observations} />}
                {selected.folio_count != null && <Row label="Folios" value={String(selected.folio_count)} />}
                <Row label="Recibido" value={formatDate(selected.received_at)} />
              </section>

              {selected.review_notes && (
                <section className={styles.detailSection}>
                  <h3>Nota de derivación</h3>
                  <p className={styles.reviewNotes}>{selected.review_notes}</p>
                </section>
              )}

              {/* Actions — only if still derivado */}
              {selected.status === 'derivado' && (
                <div className={styles.actionButtons}>
                  <button
                    className={styles.btnRederivir}
                    onClick={() => { setReDerivId(selected.id); setReDerivAreaId(''); setReDerivNotes('') }}
                  >
                    <Share2 size={16} /> Re-derivar a otra área
                  </button>
                  <button
                    className={styles.btnFinalizar}
                    onClick={() => { setConfirmId(selected.id); setNotes('') }}
                  >
                    <CheckCircle size={16} /> Marcar como Finalizado
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Re-derivar modal ─────────────────────────────────────── */}
      {reDerivId !== null && (
        <div className={styles.overlay} onClick={() => setReDerivId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Re-derivar trámite</h3>
            <p className={styles.modalDesc}>
              Selecciona el área a la que deseas redirigir este trámite.
            </p>
            <label className={styles.notesLabel}>Área destinataria <span style={{color:'#ef4444'}}>*</span></label>
            <select
              className={styles.notesInput}
              value={reDerivAreaId}
              onChange={(e) => setReDerivAreaId(e.target.value)}
            >
              <option value=''>— Seleccionar área —</option>
              {areas.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
            <label className={styles.notesLabel}>Observaciones (opcional):</label>
            <textarea
              className={styles.notesInput}
              value={reDerivNotes}
              onChange={(e) => setReDerivNotes(e.target.value)}
              placeholder="Motivo de la re-derivación…"
              rows={3}
            />
            <div className={styles.modalFooter}>
              <button
                className={styles.btnConfirm}
                disabled={!reDerivAreaId || reDerivMutation.isPending}
                onClick={() =>
                  reDerivMutation.mutate({
                    id: reDerivId,
                    toAreaId: Number(reDerivAreaId),
                    reviewNotes: reDerivNotes,
                  })
                }
              >
                {reDerivMutation.isPending ? 'Derivando…' : 'Confirmar derivación'}
              </button>
              <button className={styles.btnCancel} onClick={() => setReDerivId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm modal ───────────────────────────────────────── */}
      {confirmId !== null && (
        <div className={styles.overlay} onClick={() => setConfirmId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Finalizar trámite</h3>
            <p className={styles.modalDesc}>
              Confirma que el trámite ha sido atendido por tu área.
            </p>
            <label className={styles.notesLabel}>Observaciones (opcional):</label>
            <textarea
              className={styles.notesInput}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Resultado de la atención…"
              rows={3}
            />
            <div className={styles.modalFooter}>
              <button
                className={styles.btnConfirm}
                disabled={finalizarMutation.isPending}
                onClick={() => finalizarMutation.mutate({ id: confirmId, reviewNotes: notes })}
              >
                {finalizarMutation.isPending ? 'Guardando…' : 'Confirmar'}
              </button>
              <button className={styles.btnCancel} onClick={() => setConfirmId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Timeline Drawer ────────────────────────────────────────── */}
      {timelineSubmission && (
        <TimelineDrawer
          submission={timelineSubmission}
          onClose={() => setTimelineSubmission(null)}
        />
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: '0.85rem', padding: '3px 0' }}>
      <span style={{ color: '#6b7280', minWidth: 100, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#1f2937', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
