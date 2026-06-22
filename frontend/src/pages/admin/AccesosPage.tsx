import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldCheck, Users, ChevronDown, ChevronRight, Plus, Trash2, Check, LayoutGrid, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Area } from '@/types/area'
import type { SystemRole, PermissionsMatrix } from '@/types/role'
import styles from './AccesosPage.module.css'

// ── Types ──────────────────────────────────────────────────────────────
type Role = string   // now dynamic — any system role name
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
// ── Static fallbacks used only in RolesTab/MembresíasTab before API loads ──
const FALLBACK_LABEL: Record<string, string> = { admin: 'Administrador', manager: 'Gestor', staff: 'Personal' }
const FALLBACK_COLOR: Record<string, string> = { admin: '#9d174d', manager: '#5b21b6', staff: '#0369a1' }
const FALLBACK_BG:    Record<string, string> = { admin: '#fce7f3', manager: '#ede9fe', staff: '#e0f2fe' }

// ── Hook: load system roles once and derive label/color maps ───────────
function useSystemRoles() {
  const { data: roles = [] } = useQuery<SystemRole[]>({
    queryKey: ['system-roles'],
    queryFn: async () => {
      const res = await api.get<SystemRole[]>('/system_roles')
      return res.data
    },
    staleTime: 60_000,
  })
  const labelMap  = Object.fromEntries(roles.map((r) => [r.name, r.display_name]))
  const colorMap  = Object.fromEntries(roles.map((r) => [r.name, r.color]))
  const bgMap     = Object.fromEntries(roles.map((r) => [r.name, r.bg_color]))
  return { roles,
    label:  (name: string) => labelMap[name]  ?? FALLBACK_LABEL[name] ?? name,
    color:  (name: string) => colorMap[name]  ?? FALLBACK_COLOR[name] ?? '#6b7280',
    bg:     (name: string) => bgMap[name]     ?? FALLBACK_BG[name]    ?? '#f3f4f6',
  }
}


// ── Tab 1: System Roles ────────────────────────────────────────────────
function RolesTab() {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<Role | ''>('')
  const [pendingRoles, setPendingRoles] = useState<Record<number, Role>>({})
  const qc = useQueryClient()
  const { roles: systemRoles, label, color, bg } = useSystemRoles()
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
          {(['', ...systemRoles.map((r) => r.name)] as const).map((r) => (
            <button
              key={r}
              className={`${styles.filterBtn} ${filterRole === r ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterRole(r)}
            >
              {r === '' ? 'Todos' : label(r)}
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
                            style={{ background: bg(user.role), color: color(user.role) }}
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
                            setPendingRoles((p) => ({ ...p, [user.id]: e.target.value }))
                          }
                          style={{
                            background: bg(currentRole),
                            color: color(currentRole),
                            borderColor: color(currentRole) + '44',
                          }}
                        >
                          {systemRoles.map((r) => (
                            <option key={r.name} value={r.name}>{r.display_name}</option>
                          ))}
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
  const { label, color, bg } = useSystemRoles()

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
                        background: bg(m.user.role),
                        color: color(m.user.role),
                      }}
                    >
                      {label(m.user.role)}
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
type TabId = 'gestion_roles' | 'roles' | 'membresias' | 'permisos'

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

// ── New-role modal form ────────────────────────────────────────────────
const PRESET_COLORS = [
  { color: '#9d174d', bg: '#fce7f3' },
  { color: '#5b21b6', bg: '#ede9fe' },
  { color: '#0369a1', bg: '#e0f2fe' },
  { color: '#065f46', bg: '#d1fae5' },
  { color: '#92400e', bg: '#fef3c7' },
  { color: '#1e40af', bg: '#dbeafe' },
  { color: '#6b21a8', bg: '#f3e8ff' },
  { color: '#b91c1c', bg: '#fee2e2' },
]

interface NewRoleForm { name: string; display_name: string; color: string; bg_color: string }

function NewRoleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<NewRoleForm>({ name: '', display_name: '', color: '#065f46', bg_color: '#d1fae5' })
  const [errors, setErrors] = useState<string[]>([])

  const createMutation = useMutation({
    mutationFn: () => api.post('/system_roles', { system_role: form }),
    onSuccess: () => {
      toast.success(`Rol "${form.display_name}" creado`)
      onCreated()
      onClose()
    },
    onError: (err: any) => setErrors(err?.response?.data?.errors ?? ['Error al crear el rol']),
  })

  const setPreset = (c: { color: string; bg: string }) =>
    setForm((f) => ({ ...f, color: c.color, bg_color: c.bg }))

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Nuevo rol</h3>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.formGroup}>
          <label>Nombre del rol <span className={styles.hint}>(identificador: letras, números, _)</span></label>
          <input
            className={styles.formInput}
            placeholder="ej. supervisor"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Nombre visible</label>
          <input
            className={styles.formInput}
            placeholder="ej. Supervisor"
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          />
        </div>
        <div className={styles.formGroup}>
          <label>Color</label>
          <div className={styles.colorPresets}>
            {PRESET_COLORS.map((p) => (
              <button
                key={p.color}
                className={`${styles.colorSwatch} ${form.color === p.color ? styles.colorSwatchActive : ''}`}
                style={{ background: p.bg, borderColor: p.color }}
                onClick={() => setPreset(p)}
                title={p.color}
              >
                <span style={{ background: p.color }} className={styles.colorDot} />
              </button>
            ))}
          </div>
          <div className={styles.colorPreview} style={{ background: form.bg_color, color: form.color }}>
            {form.display_name || form.name || 'Vista previa'}
          </div>
        </div>

        {errors.length > 0 && (
          <ul className={styles.errorList}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button
            className={styles.saveBtn}
            onClick={() => createMutation.mutate()}
            disabled={!form.name || !form.display_name || createMutation.isPending}
          >
            <Plus size={14} />
            {createMutation.isPending ? 'Creando…' : 'Crear rol'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Role Management ─────────────────────────────────────────────────
function GestionRolesTab() {
  const qc = useQueryClient()
  const [showNewRole, setShowNewRole] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ display_name: string; color: string; bg_color: string }>(
    { display_name: '', color: '', bg_color: '' }
  )
  const [editErrors, setEditErrors] = useState<string[]>([])

  const { data: roles = [], isLoading } = useQuery<SystemRole[]>({
    queryKey: ['system-roles'],
    queryFn: async () => {
      const res = await api.get<SystemRole[]>('/system_roles')
      return res.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, display_name, color, bg_color }: { id: number; display_name: string; color: string; bg_color: string }) =>
      api.patch(`/system_roles/${id}`, { system_role: { display_name, color, bg_color } }),
    onSuccess: () => {
      toast.success('Rol actualizado')
      setEditingId(null)
      setEditErrors([])
      qc.invalidateQueries({ queryKey: ['system-roles'] })
    },
    onError: (err: any) =>
      setEditErrors(err?.response?.data?.errors ?? ['No se pudo actualizar el rol']),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/system_roles/${id}`),
    onSuccess: () => {
      toast.success('Rol eliminado')
      qc.invalidateQueries({ queryKey: ['system-roles'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['role-permissions'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.errors?.[0] ?? 'No se pudo eliminar el rol'),
  })

  const startEdit = (role: SystemRole) => {
    setEditingId(role.id)
    setEditErrors([])
    setEditForm({ display_name: role.display_name, color: role.color, bg_color: role.bg_color })
  }

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ['system-roles'] })
    qc.invalidateQueries({ queryKey: ['role-permissions'] })
  }

  return (
    <div>
      {showNewRole && (
        <NewRoleModal onClose={() => setShowNewRole(false)} onCreated={handleCreated} />
      )}

      <div className={styles.rolesTabHeader}>
        <p className={styles.permissionsDesc}>
          Administra los roles del sistema. Los roles protegidos no pueden eliminarse ni renombrarse.
        </p>
        <button className={styles.newRoleBtn} onClick={() => setShowNewRole(true)}>
          <Plus size={14} /> Nuevo rol
        </button>
      </div>

      {isLoading ? (
        <div className={styles.permissionsLoading}>Cargando roles…</div>
      ) : (
        <div className={styles.rolesGrid}>
          {roles.map((role) => (
            <div key={role.id} className={styles.roleCard}>
              <div className={styles.roleCardStrip} style={{ background: role.bg_color }}>
                <span
                  className={styles.roleCardBadge}
                  style={{ background: role.color, color: '#fff' }}
                >
                  {role.display_name}
                </span>
                {role.is_system && <span className={styles.systemBadge}>Sistema</span>}
              </div>

              {editingId === role.id ? (
                <div className={styles.roleCardBody}>
                  <div className={styles.formGroup}>
                    <label>Nombre visible</label>
                    <input
                      className={styles.formInput}
                      value={editForm.display_name}
                      onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Color</label>
                    <div className={styles.colorPresets}>
                      {PRESET_COLORS.map((p) => (
                        <button
                          key={p.color}
                          className={`${styles.colorSwatch} ${editForm.color === p.color ? styles.colorSwatchActive : ''}`}
                          style={{ background: p.bg, borderColor: p.color }}
                          onClick={() => setEditForm((f) => ({ ...f, color: p.color, bg_color: p.bg }))}
                        >
                          <span style={{ background: p.color }} className={styles.colorDot} />
                        </button>
                      ))}
                    </div>
                    <div
                      className={styles.colorPreview}
                      style={{ background: editForm.bg_color, color: editForm.color }}
                    >
                      {editForm.display_name || role.name}
                    </div>
                  </div>
                  {editErrors.length > 0 && (
                    <ul className={styles.errorList}>
                      {editErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                  <div className={styles.roleCardActions}>
                    <button className={styles.cancelBtn} onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                    <button
                      className={styles.saveBtn}
                      disabled={!editForm.display_name || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: role.id, ...editForm })}
                    >
                      <Check size={14} />
                      {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.roleCardBody}>
                  <div className={styles.roleCardName}>{role.display_name}</div>
                  <div className={styles.roleCardIdentifier}>
                    <code className={styles.roleCardCode}>{role.name}</code>
                  </div>
                  <div className={styles.roleCardActions}>
                    <button className={styles.editRoleBtn} onClick={() => startEdit(role)}>
                      <Pencil size={13} /> Editar
                    </button>
                    {role.deletable && (
                      <button
                        className={styles.deleteRoleBtnCard}
                        onClick={() => deleteMutation.mutate(role.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PermisosTab() {
  const qc = useQueryClient()
  // Local optimistic overrides: { roleName: { pageKey: bool } }
  const [optimistic, setOptimistic] = useState<Record<string, Record<string, boolean>>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const res = await api.get<PermissionsMatrix>('/role_permissions')
      return res.data
    },
  })

  // Per-toggle mutation — sends only the changed cell
  const toggleMutation = useMutation({
    mutationFn: ({ roleName, pageKey, newValue }: { roleName: string; pageKey: string; newValue: boolean }) =>
      api.patch('/role_permissions/update_batch', {
        permissions: { [roleName]: { [pageKey]: newValue } },
      }),
    onSuccess: (_, { roleName, pageKey }) => {
      // Remove optimistic override; server data now reflects truth
      setOptimistic((prev) => {
        const next = { ...prev }
        if (next[roleName]) {
          const role = { ...next[roleName] }
          delete role[pageKey]
          if (Object.keys(role).length === 0) delete next[roleName]
          else next[roleName] = role
        }
        return next
      })
      qc.invalidateQueries({ queryKey: ['role-permissions'] })
    },
    onError: (_, { roleName, pageKey, newValue }) => {
      // Rollback optimistic override
      setOptimistic((prev) => ({
        ...prev,
        [roleName]: { ...prev[roleName], [pageKey]: !newValue },
      }))
      toast.error('No se pudo actualizar el permiso')
    },
  })

  // Merge server data with optimistic overrides
  const currentMatrix: Record<string, Record<string, boolean>> = (() => {
    const base = data?.permissions ?? {}
    if (Object.keys(optimistic).length === 0) return base
    const merged: Record<string, Record<string, boolean>> = {}
    const allRoles = new Set([...Object.keys(base), ...Object.keys(optimistic)])
    allRoles.forEach((r) => {
      merged[r] = { ...base[r], ...optimistic[r] }
    })
    return merged
  })()

  const pageKeys: string[] = data?.page_keys ?? []
  const roles: SystemRole[] = data?.roles ?? []

  const toggle = (roleName: string, key: string) => {
    const current = currentMatrix[roleName]?.[key] ?? false
    const newValue = !current
    // Apply optimistic update immediately
    setOptimistic((prev) => ({
      ...prev,
      [roleName]: { ...prev[roleName], [key]: newValue },
    }))
    // Fire the endpoint
    toggleMutation.mutate({ roleName, pageKey: key, newValue })
  }

  const sections: string[] = Array.from(new Set(pageKeys.map((k: string) => PAGE_KEY_SECTION[k] ?? 'Otros')))
  const keysBySection = (section: string): string[] => pageKeys.filter((k: string) => (PAGE_KEY_SECTION[k] ?? 'Otros') === section)

  return (
    <div>
      <div className={styles.permissionsHeader}>
        <p className={styles.permissionsDesc}>
          Define qué páginas del menú son visibles para cada rol del sistema.
          Los cambios se guardan automáticamente al activar o desactivar cada permiso.
        </p>
      </div>

      {isLoading ? (
        <div className={styles.permissionsLoading}>Cargando matriz de permisos...</div>
      ) : (
        <div className={styles.matrixWrapper}>
          <table className={styles.matrixTable}>
            <thead>
              <tr>
                <th className={styles.matrixPageCol}>Página / Módulo</th>
                {roles.map((r) => (
                  <th
                    key={r.name}
                    className={styles.matrixRoleCol}
                  >
                    <span
                      className={styles.matrixRoleLabel}
                      style={{ background: r.bg_color, color: r.color }}
                    >
                      {r.display_name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <React.Fragment key={section}>
                  <tr className={styles.matrixSectionRow}>
                    <td colSpan={roles.length + 1} className={styles.matrixSectionLabel}>{section}</td>
                  </tr>
                  {keysBySection(section).map((key) => (
                    <tr key={key} className={styles.matrixRow}>
                      <td className={styles.matrixPageName}>
                        {PAGE_KEY_LABEL[key] ?? key}
                      </td>
                      {roles.map((role) => {
                        const allowed = currentMatrix[role.name]?.[key] ?? false
                        const isPending =
                          toggleMutation.isPending &&
                          toggleMutation.variables?.roleName === role.name &&
                          toggleMutation.variables?.pageKey === key
                        return (
                          <td key={role.name} className={styles.matrixCell}>
                            <button
                              className={`${styles.toggleBtn} ${allowed ? styles.toggleOn : styles.toggleOff} ${isPending ? styles.togglePending : ''}`}
                              onClick={() => toggle(role.name, key)}
                              disabled={isPending}
                              title={allowed ? 'Visible — clic para ocultar' : 'Oculto — clic para activar'}
                            >
                              <span className={styles.toggleThumb} />
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AccesosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as TabId) ?? 'roles'

  const setTab = (next: TabId) => setSearchParams({ tab: next }, { replace: true })

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
          className={`${styles.tab} ${tab === 'gestion_roles' ? styles.tabActive : ''}`}
          onClick={() => setTab('gestion_roles')}
        >
          <ShieldCheck size={15} />
          Roles
        </button>
        <button
          className={`${styles.tab} ${tab === 'roles' ? styles.tabActive : ''}`}
          onClick={() => setTab('roles')}
        >
          <Users size={15} />
          Usuarios
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
        {tab === 'gestion_roles' && <GestionRolesTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'membresias' && <MembresíasTab />}
        {tab === 'permisos' && <PermisosTab />}
      </div>
    </div>
  )
}
