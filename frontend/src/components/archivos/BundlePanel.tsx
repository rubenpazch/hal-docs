import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Layers, Plus, Trash2, X, ChevronDown, ChevronRight,
  Loader2, CheckCircle, Clock, Pencil
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { BundlesResponse, Archivo } from '@/types/archivo'
import styles from './BundlePanel.module.css'

interface Props {
  onClose: () => void
  // Archivos currently selected/targeted for adding to a bundle
  selectedArchivos?: Archivo[]
  onClearSelection?: () => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function BundlePanel({ onClose, selectedArchivos = [], onClearSelection }: Props) {
  const qc = useQueryClient()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [addingToId, setAddingToId] = useState<number | null>(null)

  const { data, isLoading } = useQuery<BundlesResponse>({
    queryKey: ['document-bundles'],
    queryFn: async () => {
      const res = await api.get<BundlesResponse>('/document_bundles')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api.post('/document_bundles', { document_bundle: payload }),
    onSuccess: () => {
      toast.success('Grupo creado')
      qc.invalidateQueries({ queryKey: ['document-bundles'] })
      setCreatingNew(false)
      setNewName('')
      setNewDesc('')
    },
    onError: () => toast.error('No se pudo crear el grupo'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/document_bundles/${id}`, { document_bundle: { name } }),
    onSuccess: () => {
      toast.success('Grupo actualizado')
      qc.invalidateQueries({ queryKey: ['document-bundles'] })
      setEditingId(null)
    },
    onError: () => toast.error('No se pudo actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/document_bundles/${id}`),
    onSuccess: () => {
      toast.success('Grupo eliminado')
      qc.invalidateQueries({ queryKey: ['document-bundles'] })
    },
    onError: () => toast.error('No se pudo eliminar'),
  })

  const addArchivoMutation = useMutation({
    mutationFn: ({ bundleId, archivoId }: { bundleId: number; archivoId: number }) =>
      api.post(`/document_bundles/${bundleId}/add_archivo`, { archivo_id: archivoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-bundles'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al agregar'),
  })

  const removeArchivoMutation = useMutation({
    mutationFn: ({ bundleId, archivoId }: { bundleId: number; archivoId: number }) =>
      api.delete(`/document_bundles/${bundleId}/remove_archivo`, { data: { archivo_id: archivoId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-bundles'] })
    },
    onError: () => toast.error('Error al quitar el documento'),
  })

  const handleAddSelected = async (bundleId: number) => {
    if (!selectedArchivos.length) return
    setAddingToId(bundleId)
    try {
      await Promise.all(
        selectedArchivos.map((a) =>
          addArchivoMutation.mutateAsync({ bundleId, archivoId: a.id })
        )
      )
      toast.success(`${selectedArchivos.length} documento(s) agregados al grupo`)
      onClearSelection?.()
    } finally {
      setAddingToId(null)
    }
  }

  const bundles = data?.bundles ?? []

  return (
    <div className={styles.panel}>
      {/* Panel header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <Layers size={16} />
          <span>Grupos de Documentos</span>
          <span className={styles.countBadge}>{bundles.length}</span>
        </div>
        <div className={styles.panelActions}>
          <button className={styles.btnNewGroup} onClick={() => setCreatingNew(true)} title="Crear grupo">
            <Plus size={14} /> Nuevo
          </button>
          <button className={styles.btnClose} onClick={onClose} title="Cerrar panel">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Selection banner */}
      {selectedArchivos.length > 0 && (
        <div className={styles.selectionBanner}>
          <span>{selectedArchivos.length} doc(s) seleccionados para agregar</span>
          <button className={styles.clearSel} onClick={onClearSelection}><X size={12} /></button>
        </div>
      )}

      {/* Create new form */}
      {creatingNew && (
        <div className={styles.createForm}>
          <input
            className={styles.input}
            placeholder="Nombre del grupo *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <input
            className={styles.input}
            placeholder="Descripción (opcional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <div className={styles.createFormActions}>
            <button
              className={styles.btnSave}
              disabled={!newName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: newName.trim(), description: newDesc.trim() || undefined })}
            >
              {createMutation.isPending ? <Loader2 size={12} className={styles.spin} /> : null}
              Crear
            </button>
            <button className={styles.btnCancelSmall} onClick={() => { setCreatingNew(false); setNewName(''); setNewDesc('') }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bundle list */}
      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}><Loader2 size={18} className={styles.spin} /></div>
        ) : bundles.length === 0 && !creatingNew ? (
          <div className={styles.empty}>
            <Layers size={28} strokeWidth={1.2} />
            <p>Sin grupos todavía</p>
            <button className={styles.btnNewGroup} onClick={() => setCreatingNew(true)}>
              <Plus size={12} /> Crear primer grupo
            </button>
          </div>
        ) : (
          bundles.map((b) => (
            <div key={b.id} className={styles.bundle}>
              {/* Bundle header row */}
              <div className={styles.bundleRow}>
                <button
                  className={styles.expandBtn}
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                >
                  {expandedId === b.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {editingId === b.id ? (
                  <input
                    className={`${styles.input} ${styles.inlineInput}`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateMutation.mutate({ id: b.id, name: editName })
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span className={styles.bundleName}>{b.name}</span>
                )}

                <span className={styles.bundleCount}>{b.archivos_count}</span>

                {/* Actions */}
                <div className={styles.bundleActions}>
                  {selectedArchivos.length > 0 && (
                    <button
                      className={styles.btnAddTo}
                      title="Agregar seleccionados a este grupo"
                      disabled={addingToId === b.id}
                      onClick={() => handleAddSelected(b.id)}
                    >
                      {addingToId === b.id ? <Loader2 size={11} className={styles.spin} /> : <Plus size={11} />}
                    </button>
                  )}
                  <button
                    className={styles.btnIconSm}
                    title="Editar nombre"
                    onClick={() => { setEditingId(b.id); setEditName(b.name) }}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    className={`${styles.btnIconSm} ${styles.btnDanger}`}
                    title="Eliminar grupo"
                    onClick={() => deleteMutation.mutate(b.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Archivos list when expanded */}
              {expandedId === b.id && (
                <div className={styles.archivoList}>
                  {b.archivos.length === 0 ? (
                    <p className={styles.emptyGroup}>Sin documentos en este grupo</p>
                  ) : (
                    b.archivos.map((a) => (
                      <div key={a.id} className={styles.archivoItem}>
                        {a.estado === 'firmado'
                          ? <CheckCircle size={11} className={styles.iconFirmado} />
                          : <Clock size={11} className={styles.iconBorrador} />}
                        <span className={styles.archivoItemCode}>{a.document_type.code}</span>
                        <span className={styles.archivoItemName}>{a.nombre}</span>
                        {a.file && <span className={styles.archivoItemSize}>{formatBytes(a.file.byte_size)}</span>}
                        <button
                          className={`${styles.btnIconSm} ${styles.btnDanger}`}
                          title="Quitar del grupo"
                          onClick={() => removeArchivoMutation.mutate({ bundleId: b.id, archivoId: a.id })}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
