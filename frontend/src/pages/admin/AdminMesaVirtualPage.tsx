import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Inbox, Search, RefreshCw, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '@/lib/api'
import type { VirtualSubmission, PaginationMeta } from '@/types/document'
import styles from './AdminMesaVirtualPage.module.css'

// ─── types ───────────────────────────────────────────────────────────────────
interface AdminSubmissionsResponse {
  submissions: VirtualSubmission[]
  meta: PaginationMeta
}

// ─── constants ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
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
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

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

      {/* ── Table ────────────────────────────────────────────────── */}
      <div className={styles.body} data-split="false">
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
                      className={styles.tableRow}
                      onClick={() => navigate(`/admin/mesa-virtual/${s.id}`)}
                      style={{ cursor: 'pointer' }}
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
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/mesa-virtual/${s.id}`) }}
                          title="Ver detalle"
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
      </div>
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
