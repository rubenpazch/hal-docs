import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, RotateCcw, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import ConfirmInline from '@/components/ConfirmInline/ConfirmInline'
import styles from './UsersPage.module.css'

// ── Types ──────────────────────────────────────────────────────────────
interface ApiUser {
  id: number
  nombre: string
  apellido: string
  full_name: string
  email: string
  dni: string
  telefono?: string
  role: 'admin' | 'manager' | 'staff'
  area_id?: number
  area_name?: string
  is_active: boolean
  cargo?: string
}

// ── Helpers ────────────────────────────────────────────────────────────
const ROLE_BADGE: Record<string, string> = {
  admin:   styles.badgeAdmin,
  manager: styles.badgeManager,
  staff:   styles.badgeStaff,
}

const ROLE_LABEL: Record<string, string> = {
  admin:   'Admin',
  manager: 'Gestor',
  staff:   'Personal',
}

const POSITION_LABEL: Record<string, string> = {
  jefe:           'Jefe',
  coordinador:    'Coordinador',
  operador_linea: 'Op. de Línea',
  soporte:        'Soporte',
}

// ── Skeleton row ───────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      <td><div className={styles.skeletonLine} style={{ width: '70%' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '60px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '80px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '70px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '50px' }} /></td>
      <td><div className={styles.skeletonLine} style={{ width: '50px' }} /></td>
      <td />
    </tr>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const queryClient = useQueryClient()

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const params = search
        ? { q: { nombre_or_apellido_or_email_cont: search } }
        : {}
      const res = await api.get<{ users: ApiUser[] }>('/users', { params })
      return res.data.users
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      toast.success('Usuario desactivado')
      setConfirmingId(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('No se pudo desactivar el usuario'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/users/${id}/restore`),
    onSuccess: () => {
      toast.success('Usuario reactivado')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('No se pudo reactivar el usuario'),
  })

  const users = usersData ?? []

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Gestión de Usuarios</h1>
          <p>
            {isLoading
              ? 'Cargando...'
              : `${users.length} usuario${users.length !== 1 ? 's' : ''} registrado${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.searchBar}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar usuarios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Link to="/gestion/usuarios/nuevo" className={styles.btnPrimary}>
            <Plus size={16} />
            Nuevo Usuario
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>DNI</th>
              <th>Área</th>
              <th>Cargo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : users.length === 0
              ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <Users size={32} style={{ margin: '0 auto', opacity: 0.3 }} />
                      <p>No se encontraron usuarios</p>
                    </div>
                  </td>
                </tr>
              )
              : users.map((user) => (
                <tr key={user.id} className={!user.is_active ? styles.inactiveRow : undefined}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>
                        {user.nombre[0]}{user.apellido[0]}
                      </div>
                      <div>
                        <div className={styles.userName}>{user.full_name}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>{user.dni}</td>

                  <td>
                    {user.area_name ?? <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>

                  <td>
                    {user.cargo
                      ? POSITION_LABEL[user.cargo] ?? user.cargo
                      : <span style={{ color: '#9ca3af' }}>—</span>}
                  </td>

                  <td>
                    <span className={`${styles.badge} ${ROLE_BADGE[user.role]}`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>

                  <td>
                    <span className={`${styles.badge} ${user.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  <td className={styles.actionsCell}>
                    {confirmingId === user.id ? (
                      <ConfirmInline
                        message={`¿Desactivar a ${user.nombre}?`}
                        confirmLabel="Sí, desactivar"
                        loading={deactivateMutation.isPending}
                        onConfirm={() => deactivateMutation.mutate(user.id)}
                        onCancel={() => setConfirmingId(null)}
                      />
                    ) : (
                      <div className={styles.rowActions}>
                        <Link
                          to={`/gestion/usuarios/${user.id}/editar`}
                          className={styles.iconBtn}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Link>

                        {user.is_active ? (
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            title="Desactivar"
                            onClick={() => setConfirmingId(user.id)}
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                            title="Reactivar"
                            onClick={() => restoreMutation.mutate(user.id)}
                            disabled={restoreMutation.isPending}
                            type="button"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
