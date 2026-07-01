import { useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, Plus, FileText, Trash2, CheckCircle, Clock,
  Download, Eye, PenLine, Layers, Square, CheckSquare
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Archivo, ArchivosResponse, ArchivosMeta } from '@/types/archivo'
import PreviewModal from '@/components/archivos/PreviewModal'
import SignModal from '@/components/archivos/SignModal'
import BundlePanel from '@/components/archivos/BundlePanel'
import styles from './ArchivosPage.module.css'

type EstadoFilter = '' | 'borrador' | 'firmado'

interface DocumentType { id: number; name: string; code: string }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function groupByDate(archivos: Archivo[]): Map<string, Archivo[]> {
  const map = new Map<string, Archivo[]>()
  archivos.forEach((a) => {
    const key = format(parseISO(a.created_at), 'yyyy-MM-dd')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  })
  return map
}

function formatDateHeader(dateStr: string) {
  return format(parseISO(dateStr), "d 'de' MMMM 'de' yyyy", { locale: es })
}

export default function ArchivosPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>)

  // URL-synced state
  const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const q       = searchParams.get('q') || ''
  const estado  = (searchParams.get('estado') || '') as EstadoFilter
  const tipoId  = searchParams.get('tipo') || ''

  const [searchInput, setSearchInput] = useState(q)
  const [previewArchivo, setPreviewArchivo] = useState<Archivo | null>(null)
  const [signArchivo, setSignArchivo]       = useState<Archivo | null>(null)
  const [showBundles, setShowBundles]       = useState(false)
  const [selectedIds, setSelectedIds]       = useState<Set<number>>(new Set())

  const setParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    }, { replace: true })
  }

  const handleSearch = (v: string) => {
    setSearchInput(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setParam('q', v), 350)
  }

  // Fetch document types for filter
  const { data: dtData } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await api.get<{ document_types: DocumentType[] }>('/document_types')
      return res.data.document_types
    },
  })

  // Fetch archivos
  const { data, isLoading } = useQuery<ArchivosResponse>({
    queryKey: ['archivos', page, q, estado, tipoId],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page) }
      if (q) params.q = q
      if (estado) params.estado = estado
      if (tipoId) params.document_type_id = tipoId
      const res = await api.get<ArchivosResponse>('/archivos', { params })
      return res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/archivos/${id}`),
    onSuccess: () => {
      toast.success('Archivo eliminado')
      qc.invalidateQueries({ queryKey: ['archivos'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error ?? 'No se pudo eliminar'),
  })

  const archivos = data?.archivos ?? []
  const meta: ArchivosMeta = data?.meta ?? { total: 0, page: 1, per_page: 20, total_pages: 1 }
  const groups = groupByDate(archivos)
  const documentTypes = dtData ?? []

  // Selection helpers
  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectedArchivos = archivos.filter((a) => selectedIds.has(a.id))

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Repositorio de Documentos</h1>
          <p>Sube, firma y gestiona documentos antes de vincularlos a un trámite</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.btnBundles} ${showBundles ? styles.btnBundlesActive : ''}`}
            onClick={() => setShowBundles(!showBundles)}
          >
            <Layers size={15} /> Grupos
          </button>
          <Link to="/documentos/nuevo" className={styles.btnNew}>
            <Plus size={15} /> Subir documento
          </Link>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Main content */}
        <div className={styles.main}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBar}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por nombre o tipo..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* Type filter */}
            <select
              className={styles.typeSelect}
              value={tipoId}
              onChange={(e) => setParam('tipo', e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {documentTypes.map((dt) => (
                <option key={dt.id} value={String(dt.id)}>
                  {dt.code} — {dt.name}
                </option>
              ))}
            </select>

            {/* Estado tabs */}
            <div className={styles.estadoTabs}>
              {([['', 'Todos'], ['borrador', 'Borrador'], ['firmado', 'Firmado']] as const).map(([val, label]) => (
                <button
                  key={val}
                  className={`${styles.tab} ${estado === val ? styles.tabActive : ''}`}
                  onClick={() => setParam('estado', val)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Selection toolbar */}
          {selectedIds.size > 0 && (
            <div className={styles.selectionBar}>
              <span>{selectedIds.size} seleccionado(s)</span>
              <button
                className={styles.btnAddBundles}
                onClick={() => setShowBundles(true)}
              >
                <Layers size={13} /> Agregar a grupo
              </button>
              <button className={styles.btnClearSel} onClick={() => setSelectedIds(new Set())}>
                Deseleccionar
              </button>
            </div>
          )}

          {/* Timeline */}
          {isLoading ? (
            <div className={styles.timeline}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.dateGroup}>
                  <div className={`${styles.dateHeader} ${styles.skeleton}`} style={{ width: '140px', height: '16px' }} />
                  <div className={styles.cards}>
                    {[1, 2].map((j) => (
                      <div key={j} className={`${styles.card} ${styles.cardSkeleton}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : archivos.length === 0 ? (
            <div className={styles.empty}>
              <FileText size={40} strokeWidth={1.2} />
              <p>No hay documentos{estado ? ` en estado "${estado}"` : ''}</p>
              <Link to="/documentos/nuevo" className={styles.btnNew} style={{ marginTop: '0.5rem' }}>
                <Plus size={14} /> Subir el primero
              </Link>
            </div>
          ) : (
            <div className={styles.timeline}>
              {Array.from(groups.entries()).map(([dateKey, items]) => (
                <div key={dateKey} className={styles.dateGroup}>
                  <div className={styles.dateHeader}>
                    <div className={styles.dateMarker} />
                    <span className={styles.dateLabel}>{formatDateHeader(dateKey)}</span>
                    <span className={styles.dateSub}>{items.length} doc{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className={styles.cards}>
                    {items.map((a) => {
                      const selected = selectedIds.has(a.id)
                      return (
                        <div
                          key={a.id}
                          className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
                        >
                          {/* Selection checkbox */}
                          <button
                            className={styles.selectBtn}
                            onClick={() => toggleSelect(a.id)}
                            title={selected ? 'Deseleccionar' : 'Seleccionar para grupo'}
                          >
                            {selected ? <CheckSquare size={13} className={styles.checkOn} /> : <Square size={13} />}
                          </button>

                          {/* Top: type badge + estado */}
                          <div className={styles.cardTop}>
                            <span className={styles.docTypeBadge}>{a.document_type.code}</span>
                            {a.estado === 'firmado' ? (
                              <span className={styles.badgeFirmado}>
                                <CheckCircle size={10} /> Firmado
                              </span>
                            ) : (
                              <span className={styles.badgeBorrador}>
                                <Clock size={10} /> Borrador
                              </span>
                            )}
                          </div>

                          <div className={styles.cardNombre}>{a.nombre}</div>
                          <div className={styles.cardDocType}>{a.document_type.name}</div>

                          {a.file && (
                            <div className={styles.cardFile}>
                              <FileText size={11} />
                              <span className={styles.cardFileName}>{a.file.filename}</span>
                              <span className={styles.cardFileSize}>{formatBytes(a.file.byte_size)}</span>
                            </div>
                          )}

                          <div className={styles.cardMeta}>
                            <span>{a.uploader.full_name}</span>
                            {a.tramites_count > 0 && (
                              <span className={styles.linkedBadge}>
                                {a.tramites_count} trámite{a.tramites_count !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          <div className={styles.cardActions}>
                            {/* Preview */}
                            <button
                              className={styles.btnIcon}
                              title="Vista previa"
                              onClick={() => setPreviewArchivo(a)}
                            >
                              <Eye size={13} />
                            </button>

                            {/* Sign */}
                            {a.estado === 'borrador' && (
                              <button
                                className={`${styles.btnIcon} ${styles.btnSign}`}
                                title="Firmar"
                                onClick={() => setSignArchivo(a)}
                              >
                                <PenLine size={13} />
                              </button>
                            )}

                            {/* Download */}
                            {a.file && (
                              <a
                                href={a.file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.btnIcon}
                                title="Descargar"
                              >
                                <Download size={13} />
                              </a>
                            )}

                            {/* Delete */}
                            {a.tramites_count === 0 && (
                              <button
                                className={`${styles.btnIcon} ${styles.btnDanger}`}
                                title="Eliminar"
                                onClick={() => deleteMutation.mutate(a.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.total_pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pgBtn}
                disabled={page <= 1}
                onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('page', String(page - 1)); return n }, { replace: true })}
              >
                ←
              </button>

              {Array.from({ length: meta.total_pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === meta.total_pages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className={styles.pgEllipsis}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pgBtn} ${p === page ? styles.pgBtnActive : ''}`}
                      onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                className={styles.pgBtn}
                disabled={page >= meta.total_pages}
                onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('page', String(page + 1)); return n }, { replace: true })}
              >
                →
              </button>

              <span className={styles.pgTotal}>
                {meta.total} documento{meta.total !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Bundle panel */}
        {showBundles && (
          <BundlePanel
            onClose={() => setShowBundles(false)}
            selectedArchivos={selectedArchivos}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}
      </div>

      {/* Modals */}
      {previewArchivo && (
        <PreviewModal archivo={previewArchivo} onClose={() => setPreviewArchivo(null)} />
      )}
      {signArchivo && (
        <SignModal archivo={signArchivo} onClose={() => setSignArchivo(null)} />
      )}
    </div>
  )
}
