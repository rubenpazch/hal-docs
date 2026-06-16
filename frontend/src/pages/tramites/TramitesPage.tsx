import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, FileText, X, SlidersHorizontal } from 'lucide-react'
import api from '@/lib/api'
import DocumentCard from '@/components/DocumentCard/DocumentCard'
import Pagination from '@/components/Pagination/Pagination'
import type { DocumentsResponse, DocumentStatus, DocumentPriority } from '@/types/document'
import styles from './TramitesPage.module.css'

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

const STATUS_DOT_COLOR: Record<string, string> = {
  registrado: '#3b82f6',
  en_proceso: '#f59e0b',
  derivado:   '#8b5cf6',
  respondido: '#10b981',
  archivado:  '#6b7280',
  anulado:    '#ef4444',
}

// ── Skeleton ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonLine} style={{ width: '30%' }} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineMedium}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────
export default function TramitesPage() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [priority, setPriority] = useState<DocumentPriority | ''>('')

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = { current: 0 as ReturnType<typeof setTimeout> }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 350)
  }, [])

  const handleStatusChange = (v: DocumentStatus | '') => {
    setStatus(v)
    setPage(1)
  }

  const handlePriorityChange = (v: DocumentPriority | '') => {
    setPriority(v)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatus('')
    setPriority('')
    setPage(1)
  }

  const hasFilters = debouncedSearch || status || priority

  const queryKey = ['documents', page, perPage, debouncedSearch, status, priority]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        per_page: perPage,
      }
      if (debouncedSearch) {
        params.q = { subject_or_sender_or_recipient_or_document_number_cont: debouncedSearch }
      }
      if (status) params.status = status
      if (priority) params.priority = priority

      const res = await api.get<DocumentsResponse>('/documents', { params })
      return res.data
    },
    placeholderData: (prev) => prev,
  })

  const documents = data?.documents ?? []
  const meta = data?.meta

  // Build active pills
  const pills: { key: string; label: string }[] = []
  if (debouncedSearch) pills.push({ key: 'search', label: `"${debouncedSearch}"` })
  if (status) pills.push({ key: 'status', label: STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status })
  if (priority) pills.push({ key: 'priority', label: PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority })

  const removePill = (key: string) => {
    if (key === 'search') { setSearch(''); setDebouncedSearch('') }
    if (key === 'status') setStatus('')
    if (key === 'priority') setPriority('')
    setPage(1)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Trámites Documentarios</h1>
          <p>
            {meta
              ? `${meta.total} documento${meta.total !== 1 ? 's' : ''} registrado${meta.total !== 1 ? 's' : ''}`
              : 'Cargando...'}
          </p>
        </div>
        <Link to="/tramites/nuevo" className={styles.btnNew}>
          <Plus size={16} />
          Nuevo Trámite
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por asunto, remitente, destinatario o número..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as DocumentStatus | '')}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={priority}
          onChange={(e) => handlePriorityChange(e.target.value as DocumentPriority | '')}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button className={styles.clearBtn} onClick={clearFilters} type="button">
            <X size={13} />
            Limpiar
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {pills.length > 0 && (
        <div className={styles.activePills}>
          <SlidersHorizontal size={13} style={{ color: '#6b7280' }} />
          {pills.map((pill) => (
            <span key={pill.key} className={styles.pill}>
              {pill.label}
              <button
                className={styles.pillRemove}
                onClick={() => removePill(pill.key)}
                type="button"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Status quick-stats (only when no filter active) */}
      {!hasFilters && meta && meta.total > 0 && (
        <div className={styles.statsRow}>
          {STATUS_OPTIONS.filter((s) => s.value).map((s) => {
            const count = documents.filter((d) => d.status === s.value).length
            if (count === 0) return null
            return (
              <span key={s.value} className={styles.statChip}>
                <span
                  className={styles.statDot}
                  style={{ background: STATUS_DOT_COLOR[s.value] }}
                />
                {s.label}: {count}
              </span>
            )
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : documents.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText size={40} className={styles.emptyIcon} />
          <h3>
            {hasFilters ? 'Sin resultados para esta búsqueda' : 'No hay trámites registrados'}
          </h3>
          <p>
            {hasFilters
              ? 'Intenta con otros filtros o términos de búsqueda.'
              : 'Registra el primer trámite documentario del sistema.'}
          </p>
          {!hasFilters && (
            <Link to="/tramites/nuevo" className={styles.btnNew} style={{ display: 'inline-flex' }}>
              <Plus size={15} />
              Registrar primer trámite
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>

          {meta && (
            <Pagination
              meta={meta}
              onPageChange={setPage}
              onPerPageChange={(pp) => { setPerPage(pp); setPage(1) }}
            />
          )}
        </>
      )}
    </div>
  )
}
