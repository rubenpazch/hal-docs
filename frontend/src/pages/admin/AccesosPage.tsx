import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldCheck, Users, ChevronDown, ChevronRight, Plus, Trash2, Check, LayoutGrid, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Area } from '@/types/area'
import styles from './AccesosPage.module.css'

// ── Types ──────────────────────────────────────────────────────────────
type Role = 'admin' | 'manager' | 'staff'
type PositionRole = 'jefe' | 'coordinador' | 'operador_linea' | 'soporte'

interface ApiUser {
  id: number
  full_name: string
  nombre: string
  apellido: string
  email: string
  cargo?: string
  area_name?: string
  role: Role
  is_active: boolean
}

interface Membership {
  id: number
  position_role: PositionRole
  is_active: boolean
  user: ApiUser
}

// ── Labels ─────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<Role, string> = {
  admin:   'Administrador',
  manager: 'Gestor',
  staff:   'Personal',
}

const ROLE_COLOR: Record<Role, string> = {
  admin:   '#9d174d',
  manager: '#5b21b6',
  staff:   '#0369a1',
}

const ROLE_BG: Record<Role, string> = {
  admin:   '#fce7f3',
  manager: '#ede9fe',
  staff:   '#e0f2fe',
}

const POSITION_LABEL: Record<PositionRole, string> = {
  jefe:           'Jefe',
  coordinador:    'Coordinador',
  operador_linea: 'Operador',
  soporte:        'Soporte',
}

// ── Tab 1: System Roles ────────────────────────────────────────────────
function RolesTab() {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<Role | ''>('')
  const [pendingRoles, setPendingRoles] = useState<Record<number, Role>>({})
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const params = search
        ? { q: { nombre_or_apellido_or_email_cont: search } }
        : {}
      const res = await api.get<{ users: ApiUser[] }>('/users', { params })
      return res.data.users
    },
  })

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      api.patch(`/users/${id}/update_role`, { role }),
    onSuccess: (_, vars) => {
      toast.success('Rol actualizado')
      setPendingRoles((p) => { const n = { ...p }; delete n[vars.id]; return n })
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => toast.error('No se pudo actualizar el rol'),
  })

  const filtered = users.filter((u) => !filterRole || u.role === filterRole)

  return (
    <div>
      <div className={styles.toolbarRow}>
        <div className={styles.searchBar}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          {(['', 'admin', 'manager', 'staff'] as const).map((r) => (
            <button
              key={r}
              className={`${styles.filterBtn} ${filterRole === r ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterRole(r)}
            >
              {r === '' ? 'Todos' : ROLE_LABEL[r as Role]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Área principal</th>
              <th>Rol del sistema</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className={styles.skeletonLine} /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((user) => {
                  const currentRole = pendingRoles[user.id] ?? user.role
                  const isDirty = pendingRoles[user.id] !== undefined

                  return (
                    <tr key={user.id} className={!user.is_active ? styles.rowInactive : ''}>
                      <td>
                        <div className={styles.userCell}>
                          <div
                            className={styles.userAvatar}
                            style={{ background: ROLE_BG[user.role], color: ROLE_COLOR[user.role] }}
                          >
                            {user.nombre[0]}{user.apellido[0]}
                          </div>
                          <div>
                            <div className={styles.userName}>{user.full_name}</div>
                            {!user.is_active && <span className={styles.inactiveBadge}>Inactivo</span>}
                          </div>
                        </div>
                      </td>
                      <td className={styles.muted}>{user.email}</td>
                      <td className={styles.muted}>{user.area_name ?? '—'}</td>
                      <td>
                        <select
                          className={styles.roleSelect}
                          value={currentRole}
                          onChange={(e) =>
                            setPendingRoles((p) => ({ ...p, [user.id]: e.target.value as Role }))
                          }
                          style={{
                            background: ROLE_BG[currentRole],
                            color: ROLE_COLOR[currentRole],
                            borderColor: ROLE_COLOR[currentRole] + '44',
                          }}
                        >
                          <option value="admin">Administrador</option>
                          <option value="manager">Gestor</option>
                          <option value="staff">Personal</option>
                        </select>
                      </td>
                      <td>
                        {isDirty && (
                          <button
                            className={styles.saveBtn}
                            onClick={() => updateRole.mutate({ id: user.id, role: currentRole })}
                            disabled={updateRole.isPending}
                          >
                            <Check size={14} />
                            Guardar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className={styles.empty}>No hay usuarios que coincidan</div>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Area Memberships ────────────────────────────────────────────
function MembresíasTab() {
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [addingUser, setAddingUser] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [newUserId, setNewUserId] = useState<number | null>(null)
  const [newPositionRole, setNewPositionRole] = useState<PositionRole>('soporte')
  const qc = useQueryClient()

  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await api.get<{ areas: Area[] }>('/areas')
      return res.data.areas
    },
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<{ users: ApiUser[] }>('/users')
      return res.data.users
    },
  })

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['area-members', selectedArea?.id],
    queryFn: async () => {
      const res = await api.get<{ members: Membership[] }>(`/areas/${selectedArea!.id}/members`)
      return res.data.members
    },
    enabled: !!selectedArea,
  })

  const addMember = useMutation({
    mutationFn: () =>
      api.post(`/areas/${selectedArea!.id}/add_member`, {
        user_id: newUserId,
        position_role: newPositionRole,
      }),
    onSuccess: () => {
      toast.success('Miembro agregado al área')
      qc.invalidateQueries({ queryKey: ['area-members', selectedArea?.id] })
      qc.invalidateQueries({ queryKey: ['areas'] })
      setAddingUser(false)
      setNewUserId(null)
      setUserSearch('')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errors?.[0] ?? 'No se pudo agregar el miembro'
      toast.error(msg)
    },
  })

  const updateMember = useMutation({
    mutationFn: ({ membershipId, position_role }: { membershipId: number; position_role: PositionRole }) =>
      api.patch(`/areas/${selectedArea!.id}/members/${membershipId}`, { position_role }),
    onSuccess: () => {
      toast.success('Rol actualizado')
      qc.invalidateQueries({ queryKey: ['area-members', selectedArea?.id] })
    },
    onError: () => toast.error('No se pudo actualizar'),
  })

  const removeMember = useMutation({
    mutationFn: (membershipId: number) =>
      api.delete(`/areas/${selectedArea!.id}/members/${membershipId}`),
    onSuccess: () => {
      toast.success('Miembro removido')
      qc.invalidateQueries({ queryKey: ['area-members', selectedArea?.id] })
      qc.invalidateQueries({ queryKey: ['areas'] })
    },
    onError: () => toast.error('No se pudo remover el miembro'),
  })

  // Flat list of all areas for sidebar
  function flatAreas(areas: Area[], depth = 0): (Area & { depth: number })[] {
    return (areas ?? []).flatMap((a) => [
      { ...a, depth },
      ...(a.children ? flatAreas(a.children, depth + 1) : []),
    ])
  }

  const flat = flatAreas(areasData ?? [])
  const existingUserIds = new Set((membersData ?? []).map((m) => m.user.id))
  const availableUsers = allUsers.filter(
    (u) =>
      u.is_active &&
      !existingUserIds.has(u.id) &&
      (userSearch === '' ||
        u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  return (
    <div className={styles.membershipsLayout}>
      {/* Left: area list */}
      <div className={styles.areaList}>
        <div className={styles.areaListHeader}>Áreas</div>
        {flat.map((area) => (
          <button
            key={area.id}
            className={`${styles.areaItem} ${selectedArea?.id === area.id ? styles.areaItemActive : ''}`}
            style={{ paddingLeft: `${0.75 + area.depth * 1}rem` }}
            onClick={() => setSelectedArea(area)}
          >
            {area.depth > 0 ? (
              <ChevronRight size={12} className={styles.areaDepthIcon} />
            ) : (
              <ChevronDown size={12} className={styles.areaDepthIcon} />
            )}
            <span className={styles.areaName}>{area.name}</span>
            <span className={styles.areaMembersCount}>{area.members_count}</span>
          </button>
        ))}
      </div>

      {/* Right: members panel */}
      <div className={styles.membersPanel}>
        {!selectedArea ? (
          <div className={styles.emptyState}>
            <Users size={40} strokeWidth={1.2} />
            <p>Selecciona un área para gestionar sus miembros</p>
          </div>
        ) : (
          <>
            <div className={styles.membersPanelHeader}>
              <div>
                <h3>{selectedArea.name}</h3>
                <span className={styles.membersCountLabel}>
                  {membersData?.length ?? 0} miembro{membersData?.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button className={styles.addBtn} onClick={() => setAddingUser(true)}>
                <Plus size={15} />
                Agregar miembro
              </button>
            </div>

            {/* Add member form */}
            {addingUser && (
              <div className={styles.addMemberForm}>
                <div className={styles.addMemberFields}>
                  <div className={styles.field}>
                    <label>Buscar usuario</label>
                    <input
                      className={styles.input}
                      placeholder="Nombre o email..."
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setNewUserId(null) }}
                    />
                    {userSearch && (
                      <div className={styles.userDropdown}>
                        {availableUsers.slice(0, 8).map((u) => (
                          <button
                            key={u.id}
                            className={`${styles.userDropdownItem} ${newUserId === u.id ? styles.userDropdownItemSelected : ''}`}
                            onClick={() => { setNewUserId(u.id); setUserSearch(u.full_name) }}
                          >
                            <span className={styles.userDropdownName}>{u.full_name}</span>
                            <span className={styles.userDropdownEmail}>{u.email}</span>
                          </button>
                        ))}
                        {availableUsers.length === 0 && (
                          <div className={styles.userDropdownEmpty}>Sin resultados</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label>Cargo en el área</label>
                    <select
                      className={styles.input}
                      value={newPositionRole}
                      onChange={(e) => setNewPositionRole(e.target.value as PositionRole)}
                    >
                      <option value="jefe">Jefe</option>
                      <option value="coordinador">Coordinador</option>
                      <option value="operador_linea">Operador de Línea</option>
                      <option value="soporte">Soporte</option>
                    </select>
                  </div>
                </div>
                <div className={styles.addMemberActions}>
                  <button
                    className={styles.saveBtn}
                    onClick={() => addMember.mutate()}
                    disabled={!newUserId || addMember.isPending}
                  >
                    <Check size={14} /> Confirmar
                  </button>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => { setAddingUser(false); setNewUserId(null); setUserSearch('') }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Members list */}
            {loadingMembers ? (
              <div className={styles.membersLoading}>Cargando miembros...</div>
            ) : membersData?.length === 0 ? (
              <div className={styles.emptyState} style={{ height: '160px' }}>
                <Users size={28} strokeWidth={1.2} />
                <p>Esta área no tiene miembros aún</p>
              </div>
            ) : (
              <div className={styles.membersList}>
                {membersData?.map((m) => (
                  <div key={m.id} className={`${styles.memberRow} ${!m.is_active ? styles.memberRowInactive : ''}`}>
                    <div className={styles.memberAvatar}>
                      {m.user.nombre[0]}{m.user.apellido[0]}
                    </div>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{m.user.full_name}</div>
                      <div className={styles.memberEmail}>{m.user.email}</div>
                    </div>
                    <select
                      className={styles.positionSelect}
                      defaultValue={m.position_role}
                      onChange={(e) =>
                        updateMember.mutate({
                          membershipId: m.id,
                          position_role: e.target.value as PositionRole,
                        })
                      }
                    >
                      <option value="jefe">Jefe</option>
                      <option value="coordinador">Coordinador</option>
                      <option value="operador_linea">Operador</option>
                      <option value="soporte">Soporte</option>
                    </select>
                    <span
                      className={styles.sysRoleBadge}
                      style={{
                        background: ROLE_BG[m.user.role],
                        color: ROLE_COLOR[m.user.role],
                      }}
                    >
                      {ROLE_LABEL[m.user.role]}
                    </span>
                    <button
                      className={styles.removeBtn}
                      title="Remover del área"
                      onClick={() => removeMember.mutate(m.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
type TabId = 'roles' | 'membresias' | 'permisos'

// ── Tab 3: Menu Permissions Matrix ─────────────────────────────────────
const PAGE_KEY_LABEL: Record<string, string> = {
  dashboard:          'Dashboard',
  tramites:           'Trámites',
  documentos:         'Documentos',
  pendientes:         'Pendientes',
  archivo:            'Archivo',
  usuarios:           'Gestión de Usuarios',
  areas:              'Gestión de Áreas',
  tipos_doc:          'Tipos de Documento',
  mis_certificados:   'Mis Certificados',
  mis_derivados:      'Mis Derivados (Bandeja)',
  mesa_virtual_admin: 'Mesa Virtual (Admin)',
  accesos:            'Accesos y Permisos',
  reportes:           'Reportes',
  configuracion:      'Configuración',
}

const PAGE_KEY_SECTION: Record<string, string> = {
  dashboard:          'Principal',
  tramites:           'Gestión',
  documentos:         'Gestión',
  pendientes:         'Gestión',
  archivo:            'Gestión',
  usuarios:           'Administración',
  areas:              'Administración',
  tipos_doc:          'Administración',
  mesa_virtual_admin: 'Administración',
  accesos:            'Administración',
  mis_certificados:   'Mi Cuenta',
  mis_derivados:      'Mi Bandeja',
  reportes:           'Análisis',
  configuracion:      'Análisis',
}

interface PermissionsMatrix {
  permissions: Record<Role, Record<string, boolean>>
  page_keys: string[]
}

function PermisosTab() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Record<Role, Record<string, boolean>> | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const res = await api.get<PermissionsMatrix>('/role_permissions')
      return res.data
    },
    onSuccess: (data) => {
      if (!draft) setDraft(JSON.parse(JSON.stringify(data.permissions)))
    },
  } as any)

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/role_permissions/update_batch', { permissions: draft }),
    onSuccess: () => {
      toast.success('Permisos de menú guardados')
      qc.invalidateQueries({ queryKey: ['role-permissions'] })
      setIsDirty(false)
    },
    onError: () => toast.error('No se pudieron guardar los permisos'),
  })

  const currentMatrix = draft ?? data?.permissions
  const pageKeys = data?.page_keys ?? []

  const toggle = (role: Role, key: string) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = JSON.parse(JSON.stringify(prev)) as Record<Role, Record<string, boolean>>
      next[role][key] = !next[role][key]
      return next
    })
    setIsDirty(true)
  }

  const resetDraft = () => {
    if (data) {
      setDraft(JSON.parse(JSON.stringify(data.permissions)))
      setIsDirty(false)
    }
  }

  // Group page keys by section for display
  const sections = Array.from(new Set(pageKeys.map((k) => PAGE_KEY_SECTION[k] ?? 'Otros')))
  const keysBySection = (section: string) => pageKeys.filter((k) => (PAGE_KEY_SECTION[k] ?? 'Otros') === section)

  const roles: Role[] = ['admin', 'manager', 'staff']

  return (
    <div>
      <div className={styles.permissionsHeader}>
        <p className={styles.permissionsDesc}>
          Define qué páginas del menú son visibles para cada rol del sistema.
          Los cambios se aplican inmediatamente al refrescar la sesión.
        </p>
        <div className={styles.permissionsActions}>
          {isDirty && (
            <button className={styles.cancelBtn} onClick={resetDraft}>
              <RotateCcw size={14} /> Descartar
            </button>
          )}
          <button
            className={styles.saveBtn}
            onClick={() => saveMutation.mutate()}
            disabled={!isDirty || saveMutation.isPending}
          >
            <Check size={14} />
            {saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {isLoading || !currentMatrix ? (
        <div className={styles.permissionsLoading}>Cargando matriz de permisos...</div>
      ) : (
        <div className={styles.matrixWrapper}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th className={styles.matrixPageCol}>Página / Módulo</th>
                {roles.map((r) => (
                  <th
                    key={r}
                    className={styles.matrixRoleCol}
                    style={{ color: ROLE_COLOR[r] }}
                  >
                    <span
                      className={styles.matrixRoleLabel}
                      style={{ background: ROLE_BG[r], color: ROLE_COLOR[r] }}
                    >
                      {ROLE_LABEL[r]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <>
                  <tr key={section} className={styles.matrixSectionRow}>
                    <td colSpan={4} className={styles.matrixSectionLabel}>{section}</td>
                  </tr>
                  {keysBySection(section).map((key) => (
                    <tr key={key} className={styles.matrixRow}>
                      <td className={styles.matrixPageName}>
                        {PAGE_KEY_LABEL[key] ?? key}
                      </td>
                      {roles.map((role) => {
                        const allowed = currentMatrix[role]?.[key] ?? false
                        return (
                          <td key={role} className={styles.matrixCell}>
                            <button
                              className={`${styles.toggleBtn} ${allowed ? styles.toggleOn : styles.toggleOff}`}
                              onClick={() => toggle(role, key)}
                              title={allowed ? 'Visible — clic para ocultar' : 'Oculto — clic para activar'}
                            >
                              <span className={styles.toggleThumb} />
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AccesosPage() {
  const [tab, setTab] = useState<TabId>('roles')

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <ShieldCheck size={22} className={styles.pageHeaderIcon} />
        <div>
          <h1>Accesos y Permisos</h1>
          <p>Gestiona roles del sistema, membresías de áreas y visibilidad del menú</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'roles' ? styles.tabActive : ''}`}
          onClick={() => setTab('roles')}
        >
          <ShieldCheck size={15} />
          Roles del sistema
        </button>
        <button
          className={`${styles.tab} ${tab === 'membresias' ? styles.tabActive : ''}`}
          onClick={() => setTab('membresias')}
        >
          <Users size={15} />
          Membresías por área
        </button>
        <button
          className={`${styles.tab} ${tab === 'permisos' ? styles.tabActive : ''}`}
          onClick={() => setTab('permisos')}
        >
          <LayoutGrid size={15} />
          Permisos de menú
        </button>
      </div>

      <div className={styles.tabContent}>
        {tab === 'roles' && <RolesTab />}
        {tab === 'membresias' && <MembresíasTab />}
        {tab === 'permisos' && <PermisosTab />}
      </div>
    </div>
  )
}
