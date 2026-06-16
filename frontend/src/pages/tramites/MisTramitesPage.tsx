import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, FileText, Eye, MoreVertical,
  CheckCircle, Archive, XCircle, Clock, X,
} from 'lucide-react'
import { formatDistanceToNow, parseISO, differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'
import Pagination from '@/components/Pagination/Pagination'
import type { Document, DocumentsResponse, DocumentStatus, DocumentPriority } from '@/types/document'
import styles from './MisTramitesPage.module.css'

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: DocumentStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'registrado', label: 'Registrado' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'derivado', label: 'Derivado' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'archivado', label: 'Archivado' },
  { value: 'anulado', label: 'Anulado' },
]

const PRIORITY_OPTIONS: { value: DocumentPriority | ''; label: string }[] = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const STATUS_LABEL: Record<DocumentStatus, string> = {
  registrado: 'Registrado', en_proceso: 'En Proceso', derivado: 'Derivado',
  respondido: 'Respondido', archivado: 'Archivado', anulado: 'Anulado',
  devuelto: 'Devuelto', finalizado: 'Finalizado',
}

const STATUS_CLASS: Record<DocumentStatus, string> = {
  registrado: styles.statusRegistrado, en_proceso: styles.statusEnProceso,
  derivado: styles.statusDerivado, respondido: styles.statusRespondido,
  archivado: styles.statusArchivado, anulado: styles.statusAnulado,
  devuelto: styles.statusDevuelto, finalizado: styles.statusFinalizado,
}

const PRIORITY_LABEL: Record<DocumentPriority, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
}

const PRIORITY_CLASS: Record<DocumentPriority, string> = {
  baja: styles.priorityBaja, media: styles.priorityMedia,
  alta: styles.priorityAlta, urgente: styles.priorityUrgente,
}

// Actions available per status
const STATUS_TRANSITIONS: Record<DocumentStatus, { value: DocumentStatus; label: string; icon: React.ReactNode }[]> = {
  registrado: [
    { value: 'en_proceso', label: 'Marcar En Proceso', icon: <Clock size={13} /> },
    { value: 'anulado',    label: 'Anular',            icon: <XCircle size={13} /> },
  ],
  en_proceso: [
    { value: 'derivado',   label: 'Derivar',           icon: <FileText size={13} /> },
    { value: 'respondido', label: 'Marcar Respondido', icon: <CheckCircle size={13} /> },
    { value: 'anulado',    label: 'Anular',            icon: <XCircle size={13} /> },
  ],
  derivado: [
    { value: 'respondido', label: 'Marcar Respondido', icon: <CheckCircle size={13} /> },
    { value: 'anulado',    label: 'Anular',            icon: <XCircle size={13} /> },
  ],
  respondido: [
    { value: 'archivado',  label: 'Archivar',          icon: <Archive size={13} /> },
  ],
  archivado: [],
  anulado:   [],
  devuelto:  [
    { value: 'en_proceso', label: 'Retomar', icon: <Clock size={13} /> },
  ],
  finalizado: [],
}

// ── Helpers ────────────────────────────────────────────────────────────
function dueDateBadge(iso: string) {
  const diff = differenceInDays(parseISO(iso), new Date())
  const label = format(parseISO(iso), 'dd MMM yyyy', { locale: es })
  if (diff < 0)  return <span className={`${styles.dueDate} ${styles.dueDateOverdue}`}>{label}</span>
  if (diff <= 3) return <span className={`${styles.dueDate} ${styles.dueDateWarning}`}>{label}</span>
  return <span className={`${styles.dueDate} ${styles.dueDateOk}`}>{label}</span>
}

// ── Skeleton row ───────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      {[15, 35, 12, 12, 14, 12].map((w, i) => (
        <td key={i}><div className={styles.skeletonCell} style={{ width: `${w}ch` }} /></td>
      ))}
    </tr>
  )
}

// ── Action menu ────────────────────────────────────────────────────────
function ActionMenu({
  doc,
  onStatusChange,
  onClose,
}: {
  doc: Document
  onStatusChange: (id: number, status: DocumentStatus) => void
  onClose: () => void
}) {
  const transitions = STATUS_TRANSITIONS[doc.status]

  return (
    <div className={styles.menuDropdown}>
      <Link
        to={`/tramites/${doc.id}`}
        className={styles.menuItem}
        onClick={onClose}
      >
        <Eye size={13} /> Ver detalle
      </Link>
      {transitions.length > 0 && <div className={styles.menuDivider} />}
      {transitions.map((t) => (
        <button
          key={t.value}
          className={`${styles.menuItem} ${t.value === 'anulado' ? styles.menuItemDanger : ''}`}
          onClick={() => { onStatusChange(doc.id, t.value); onClose() }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────
export default function MisTramitesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [perPage] = useState(15)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = { current: 0 as ReturnType<typeof setTimeout> }
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [priority, setPriority] = useState<DocumentPriority | ''>('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDebouncedSearch(value); setPage(1) }, 350)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['documents-mine', page, perPage, debouncedSearch, status, priority],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, per_page: perPage }
      if (debouncedSearch) params.q = { subject_or_sender_or_recipient_or_document_number_cont: debouncedSearch }
      if (status)   params.status   = status
      if (priority) params.priority = priority
      const res = await api.get<DocumentsResponse>('/documents/mine', { params })
      return res.data
    },
    placeholderData: (prev) => prev,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: DocumentStatus }) =>
      api.patch(`/documents/${id}/update_status`, { status: newStatus }),
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['documents-mine'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success(`Estado actualizado a "${STATUS_LABEL[newStatus]}"`)
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  })

  const documents = data?.documents ?? []
  const meta = data?.meta

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis Trámites</h1>
          <p className={styles.subtitle}>
            {meta
              ? `${meta.total} trámite${meta.total !== 1 ? 's' : ''} registrado${meta.total !== 1 ? 's' : ''} por ti`
              : 'Cargando…'}
          </p>
        </div>
        <Link to="/tramites/nuevo" className={styles.btnNew}>
          <Plus size={15} /> Nuevo Trámite
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por asunto, remitente, número…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => handleSearchChange('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => { setStatus(e.target.value as DocumentStatus | ''); setPage(1) }}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className={styles.filterSelect}
          value={priority}
          onChange={(e) => { setPriority(e.target.value as DocumentPriority | ''); setPage(1) }}
        >
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Número</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Fecha límite</th>
              <th>Registrado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : documents.length === 0
              ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <FileText size={36} strokeWidth={1.2} />
                      <p>No tienes trámites registrados aún.</p>
                      <Link to="/tramites/nuevo" className={styles.btnNew} style={{ marginTop: 4 }}>
                        <Plus size={14} /> Crear trámite
                      </Link>
                    </div>
                  </td>
                </tr>
              )
              : documents.map((doc) => (
                <tr
                  key={doc.id}
                  className={styles.row}
                  onClick={() => navigate(`/tramites/${doc.id}`)}
                >
                  <td>
                    <div className={styles.docMeta}>
                      <span className={styles.docNumber}>{doc.document_number}</span>
                      <span className={styles.docType}>{doc.document_type.name}</span>
                    </div>
                  </td>
                  <td className={styles.subjectCell}>{doc.subject}</td>
                  <td>
                    <span className={`${styles.badge} ${STATUS_CLASS[doc.status]}`}>
                      {STATUS_LABEL[doc.status]}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${PRIORITY_CLASS[doc.priority]}`}>
                      {PRIORITY_LABEL[doc.priority]}
                    </span>
                  </td>
                  <td>{doc.due_date ? dueDateBadge(doc.due_date) : <span className={styles.na}>—</span>}</td>
                  <td className={styles.dateCell}>
                    {formatDistanceToNow(parseISO(doc.created_at), { addSuffix: true, locale: es })}
                  </td>
                  <td
                    className={styles.actionCell}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.menuWrap}>
                      <button
                        className={`${styles.menuTrigger} ${openMenuId === doc.id ? styles.menuTriggerActive : ''}`}
                        onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                        aria-label="Acciones"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {openMenuId === doc.id && (
                        <ActionMenu
                          doc={doc}
                          onStatusChange={(id, s) => updateStatus.mutate({ id, newStatus: s })}
                          onClose={() => setOpenMenuId(null)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <Pagination
          meta={meta}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
