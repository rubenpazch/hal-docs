import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Plus, Building2, Users, ChevronRight, Pencil, Trash2, RotateCcw, EyeOff, Eye } from 'lucide-react'
import api from '@/lib/api'
import type { AreasResponse, Area, AreaType } from '@/types/area'
import styles from './AreasPage.module.css'

// ── Helpers ────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<AreaType, string> = {
  gerencia:     'Gerencia',
  departamento: 'Departamento',
  equipo:       'Equipo',
  unidad:       'Unidad',
}

const TYPE_CLASS: Record<AreaType, string> = {
  gerencia:     styles.typeGerencia,
  departamento: styles.typeDepartamento,
  equipo:       styles.typeEquipo,
  unidad:       styles.typeUnidad,
}

// ── Skeleton row ───────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      <td><div className={styles.skeletonLine} style={{ width: '60%' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '70px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '40px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '40px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '50px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '70px' }} /></td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function AreasPage() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await api.get<AreasResponse>('/areas')
      return res.data
    },
  })

  // ── Mutations ──────────────────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      toast.success('Área desactivada')
    },
    onError: () => toast.error('No se pudo desactivar el área'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/areas/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      toast.success('Área reactivada')
    },
    onError: () => toast.error('No se pudo reactivar el área'),
  })

  // ── Flatten tree for table display ────────────────────────────────
  function flattenAreas(areas: Area[], depth = 0): (Area & { depth: number })[] {
    return areas.flatMap((a) => [
      { ...a, depth },
      ...(a.children ? flattenAreas(a.children, depth + 1) : []),
    ])
  }

  const allAreas = data ? flattenAreas(data.areas) : []

  const filtered = allAreas.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? '').toLowerCase().includes(search.toLowerCase())

    // The API only returns kept areas (the controller uses Area.kept).
    // We display all; "inactive" requires the discard flag — the API
    // doesn't expose discarded_at, so we show all returned areas.
    return matchesSearch
  })

  const handleDeactivate = (area: Area) => {
    if (!confirm(`¿Desactivar el área "${area.name}"? Sus sub-áreas perderán el vínculo de padre.`)) return
    deactivateMutation.mutate(area.id)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Áreas Organizacionales</h1>
          <p>
            {data
              ? `${data.meta.total} área${data.meta.total !== 1 ? 's' : ''} registrada${data.meta.total !== 1 ? 's' : ''}`
              : 'Cargando...'}
          </p>
        </div>
        <Link to="/gestion/areas/nuevo" className={styles.btnNew}>
          <Plus size={16} />
          Nueva Área
        </Link>
      </div>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar área..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className={`${styles.toggleInactive} ${showInactive ? styles.toggleInactiveActive : ''}`}
          onClick={() => setShowInactive((v) => !v)}
          type="button"
        >
          {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
          {showInactive ? 'Ocultar inactivas' : 'Mostrar inactivas'}
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Área</th>
              <th>Tipo</th>
              <th>Sub-áreas</th>
              <th>Miembros</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.empty}>
                      <Building2 size={38} />
                      <h3>{search ? 'Sin resultados' : 'No hay áreas registradas'}</h3>
                      <p>
                        {search
                          ? 'Intenta con otro término de búsqueda.'
                          : 'Crea la primera área organizacional.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )
              : filtered.map((area) => {
                const isActive = true // all returned by API are active (kept)
                return (
                  <tr key={area.id} className={!isActive ? styles.inactiveRow : undefined}>
                    {/* Name + hierarchy indent */}
                    <td>
                      <div className={styles.areaName} style={{ paddingLeft: area.depth * 20 }}>
                        {area.depth > 0 && (
                          <ChevronRight size={13} style={{ display: 'inline', marginRight: 4, color: '#9ca3af' }} />
                        )}
                        {area.name}
                      </div>
                      {area.description && (
                        <div className={styles.parentPath}>
                          {area.description.length > 60
                            ? area.description.slice(0, 60) + '…'
                            : area.description}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`${styles.typeBadge} ${TYPE_CLASS[area.area_type]}`}>
                        {TYPE_LABEL[area.area_type]}
                      </span>
                    </td>

                    {/* Children count */}
                    <td>
                      <span className={styles.countChip}>
                        <Building2 size={13} />
                        {area.children_count}
                      </span>
                    </td>

                    {/* Members count */}
                    <td>
                      <span className={styles.countChip}>
                        <Users size={13} />
                        {area.members_count}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`${styles.statusBadge} ${isActive ? styles.statusActive : styles.statusInactive}`}>
                        {isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={styles.actions}>
                        <Link
                          to={`/gestion/areas/${area.id}/editar`}
                          className={styles.btnIcon}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Link>

                        {isActive ? (
                          <button
                            className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                            onClick={() => handleDeactivate(area)}
                            disabled={deactivateMutation.isPending}
                            title="Desactivar"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            className={`${styles.btnIcon} ${styles.btnIconRestore}`}
                            onClick={() => restoreMutation.mutate(area.id)}
                            disabled={restoreMutation.isPending}
                            title="Reactivar"
                            type="button"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
