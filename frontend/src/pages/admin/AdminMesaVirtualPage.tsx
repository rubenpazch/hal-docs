import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Inbox, Search, RefreshCw, Eye, CheckCircle, AlertCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import type { VirtualSubmission, PaginationMeta } from '@/types/document'
import type { Area } from '@/types/area'
import styles from './AdminMesaVirtualPage.module.css'

// ─── types ──────────────────────────────────────────────────────────────────
interface AdminSubmissionsResponse {
  submissions: VirtualSubmission[]
  meta: PaginationMeta
}

// ─── constants ───────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
}

const STATUS_NEXT: Record<string, { value: string; label: string; icon: React.ReactNode }[]> = {
  registrado:  [
    { value: 'en_revision', label: 'Poner en revisión', icon: <RefreshCw size={14} /> },
  ],
  en_revision: [
    { value: 'observado',  label: 'Observar',  icon: <AlertCircle size={14} /> },
    { value: 'derivado',   label: 'Derivar',   icon: <ChevronRight size={14} /> },
    { value: 'finalizado', label: 'Finalizar', icon: <CheckCircle size={14} /> },
  ],
  observado: [
    { value: 'en_revision', label: 'Retomar revisión', icon: <RefreshCw size={14} /> },
  ],
  derivado: [
    { value: 'finalizado', label: 'Finalizar', icon: <CheckCircle size={14} /> },
  ],
  finalizado: [],
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

// ─── component ───────────────────────────────────────────────────────────────
export default function AdminMesaVirtualPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<VirtualSubmission | null>(null)
  const [actionModal, setActionModal] = useState<{
    submission: VirtualSubmission
    nextStatus: string
    label: string
  } | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [toAreaId, setToAreaId] = useState<number | ''>('')
  const [areaError, setAreaError] = useState('')

  // ── fetch areas (for derivar) ────────────────────────────────────────────
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ['areas-list'],
    queryFn: async () => {
      const { data } = await api.get('/areas', { params: { per_page: 100 } })
      return data.areas ?? []
    },
  })

  // ── fetch ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<AdminSubmissionsResponse>({
    queryKey: ['admin-virtual-submissions', search, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 20 }
      if (search) params.q = search
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/admin/virtual_submissions', { params })
      return data
    },
  })

  // ── update status mutation ───────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, status, notes, areaId }: { id: number; status: string; notes: string; areaId?: number }) =>
      api.patch(`/admin/virtual_submissions/${id}/update_status`, {
        status,
        review_notes: notes,
        to_area_id: areaId,
      }),
    onSuccess: () => {
      toast.success('Estado actualizado correctamente')
      qc.invalidateQueries({ queryKey: ['admin-virtual-submissions'] })
      setActionModal(null)
      setReviewNotes('')
      setToAreaId('')
      setAreaError('')
      // refresh detail if open
      if (selected) {
        api.get(`/admin/virtual_submissions/${selected.id}`).then(({ data }) => {
          setSelected(data.submission)
        })
      }
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  })

  const submissions = data?.submissions ?? []
  const meta = data?.meta

  return (
    <div className={styles.page}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Inbox size={22} />
          <div>
            <h1 className={styles.title}>Mesa de Partes Virtual</h1>
            <p className={styles.subtitle}>
              Trámites recibidos desde el portal público
            </p>
          </div>
        </div>
        <a
          href="/mesa-virtual"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.portalLink}
        >
          Ver portal público ↗
        </a>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por número de trámite, nombre, DNI/RUC, asunto…"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className={styles.statusSelect}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      </div>

      {/* ── Table + Detail (side-by-side when detail open) ───────── */}
      <div className={styles.body} data-split={selected ? 'true' : 'false'}>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={styles.tableWrapper}>
            {isLoading ? (
              <div className={styles.loading}>
                <RefreshCw size={20} className={styles.spin} /> Cargando…
              </div>
            ) : submissions.length === 0 ? (
              <div className={styles.empty}>
                <Inbox size={40} />
                <p>No se encontraron trámites</p>
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
                        <span className={styles.submitterType} data-type={s.submitter_type}>
                          {s.submitter_type === 'natural' ? 'Natural' : 'Jurídica'}
                        </span>
                      </td>
                      <td>{s.document_type?.name ?? '—'}</td>
                      <td>
                        <div className={styles.submitterName}>{s.submitter_name}</div>
                        <div className={styles.submitterDoc}>{s.submitter_document}</div>
                      </td>
                      <td className={styles.subjectCell}>{s.subject}</td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className={styles.dateCell}>{formatDate(s.received_at)}</td>
                      <td>
                        <button
                          className={styles.viewBtn}
                          onClick={(e) => { e.stopPropagation(); setSelected(s) }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <span className={styles.pageInfo}>
                Página {meta.current_page} de {meta.total_pages} · {meta.total} trámites
              </span>
              <button
                className={styles.pageBtn}
                disabled={page === meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
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
              <StatusBadge status={selected.status} />

              <section className={styles.detailSection}>
                <h3>Datos del remitente</h3>
                <Row label="Tipo" value={selected.submitter_type === 'natural' ? 'Persona Natural' : 'Persona Jurídica'} />
                <Row label="Nombre" value={selected.submitter_name} />
                <Row label="Documento" value={selected.submitter_document} />
                <Row label="Correo" value={selected.submitter_email} />
                {selected.submitter_phone && <Row label="Teléfono" value={selected.submitter_phone} />}
                {selected.submitter_type === 'juridica' && (
                  <>
                    <Row label="Razón Social" value={selected.company_name ?? '—'} />
                    <Row label="Representante" value={selected.representative_name ?? '—'} />
                  </>
                )}
              </section>

              <section className={styles.detailSection}>
                <h3>Datos del documento</h3>
                <Row label="Tipo Doc." value={selected.document_type?.name ?? '—'} />
                <Row label="Asunto" value={selected.subject} />
                {selected.observations && <Row label="Observaciones" value={selected.observations} />}
                {selected.folio_count != null && <Row label="Folios" value={String(selected.folio_count)} />}
                <Row label="Recibido" value={formatDate(selected.received_at)} />
                {selected.to_area && (
                  <Row label="Derivado a" value={selected.to_area.name} />
                )}
              </section>

              {selected.review_notes && (
                <section className={styles.detailSection}>
                  <h3>Notas de revisión</h3>
                  <p className={styles.reviewNotes}>{selected.review_notes}</p>
                </section>
              )}

              {/* Actions */}
              {(STATUS_NEXT[selected.status] ?? []).length > 0 && (
                <section className={styles.detailActions}>
                  <h3>Cambiar estado</h3>
                  <div className={styles.actionBtns}>
                    {(STATUS_NEXT[selected.status] ?? []).map((a) => (
                      <button
                        key={a.value}
                        className={styles.actionBtn}
                        data-variant={a.value === 'finalizado' ? 'success' : a.value === 'observado' ? 'warn' : 'default'}
                        onClick={() => {
                          setActionModal({ submission: selected, nextStatus: a.value, label: a.label })
                          setReviewNotes('')
                          setToAreaId('')
                          setAreaError('')
                        }}
                      >
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Action confirmation modal ─────────────────────────────── */}
      {actionModal && (
        <div className={styles.modalOverlay} onClick={() => setActionModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{actionModal.label}</h3>
            <p className={styles.modalDesc}>
              Trámite: <strong>{actionModal.submission.tracking_number}</strong>
            </p>

            {/* ── Area selector — only shown for "derivar" ── */}
            {actionModal.nextStatus === 'derivado' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label className={styles.notesLabel}>Área destinataria (*)</label>
                <select
                  className={styles.notesInput}
                  style={{ padding: '0.55rem 0.75rem', resize: 'none',
                           borderColor: areaError ? '#dc3545' : undefined }}
                  value={toAreaId}
                  onChange={(e) => { setToAreaId(Number(e.target.value)); setAreaError('') }}
                >
                  <option value="">Seleccione un área…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {areaError && (
                  <span style={{ fontSize: '0.78rem', color: '#dc3545' }}>{areaError}</span>
                )}
              </div>
            )}

            <label className={styles.notesLabel}>
              Notas / motivo de {actionModal.label.toLowerCase()} (opcional):
            </label>
            <textarea
              className={styles.notesInput}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Ingrese una observación o nota para el ciudadano…"
              rows={3}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.modalConfirm}
                disabled={updateMutation.isPending}
                onClick={() => {
                  if (actionModal.nextStatus === 'derivado' && !toAreaId) {
                    setAreaError('Debe seleccionar el área destinataria')
                    return
                  }
                  updateMutation.mutate({
                    id: actionModal.submission.id,
                    status: actionModal.nextStatus,
                    notes: reviewNotes,
                    areaId: toAreaId ? Number(toAreaId) : undefined,
                  })
                }}
              >
                {updateMutation.isPending ? 'Guardando…' : 'Confirmar'}
              </button>
              <button className={styles.modalCancel} onClick={() => setActionModal(null)}>
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
  const COLOR: Record<string, string> = {
    registrado: 'blue', en_revision: 'orange', observado: 'red',
    derivado: 'purple', finalizado: 'green',
  }
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 20,
        fontSize: '0.75rem', fontWeight: 600,
        background: COLOR[status] === 'blue'   ? '#dbeafe'
                  : COLOR[status] === 'orange' ? '#fff7ed'
                  : COLOR[status] === 'red'    ? '#fee2e2'
                  : COLOR[status] === 'purple' ? '#ede9fe'
                  :                              '#dcfce7',
        color:     COLOR[status] === 'blue'   ? '#1e40af'
                  : COLOR[status] === 'orange' ? '#c2410c'
                  : COLOR[status] === 'red'    ? '#b91c1c'
                  : COLOR[status] === 'purple' ? '#6d28d9'
                  :                              '#166534',
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: '0.85rem', padding: '3px 0' }}>
      <span style={{ color: '#6c757d', minWidth: 110, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#212529', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}
