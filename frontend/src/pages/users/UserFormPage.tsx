import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ChevronRight, Save } from 'lucide-react'
import api from '@/lib/api'
import type { AreasResponse } from '@/types/area'
import styles from './UserFormPage.module.css'

// ── Types ──────────────────────────────────────────────────────────────
interface ApiUser {
  id: number
  nombre: string
  apellido: string
  email: string
  dni: string
  telefono?: string
  role: 'admin' | 'manager' | 'staff'
  area_id?: number
  cargo?: string
  is_active: boolean
}

// ── Schemas ────────────────────────────────────────────────────────────
const createSchema = z
  .object({
    nombre:                z.string().min(1, 'Requerido'),
    apellido:              z.string().min(1, 'Requerido'),
    email:                 z.string().email('Correo inválido'),
    dni:                   z.string().length(8, 'Debe tener 8 dígitos').regex(/^\d+$/, 'Solo números'),
    telefono:              z.string().optional(),
    role:                  z.enum(['admin', 'manager', 'staff']),
    area_id:               z.string().optional(),
    position_role:         z.enum(['jefe', 'coordinador', 'operador_linea', 'soporte']).optional(),
    password:              z.string().min(6, 'Mínimo 6 caracteres'),
    password_confirmation: z.string().min(1, 'Requerido'),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

const editSchema = z
  .object({
    nombre:                z.string().min(1, 'Requerido'),
    apellido:              z.string().min(1, 'Requerido'),
    email:                 z.string().email('Correo inválido'),
    dni:                   z.string().length(8, 'Debe tener 8 dígitos').regex(/^\d+$/, 'Solo números'),
    telefono:              z.string().optional(),
    role:                  z.enum(['admin', 'manager', 'staff']),
    area_id:               z.string().optional(),
    position_role:         z.enum(['jefe', 'coordinador', 'operador_linea', 'soporte']).optional(),
    password:              z.string().optional(),
    password_confirmation: z.string().optional(),
  })
  .refine(
    (d) => !d.password || d.password === d.password_confirmation,
    { message: 'Las contraseñas no coinciden', path: ['password_confirmation'] }
  )

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>
type FormValues = CreateForm | EditForm

// ── Component ──────────────────────────────────────────────────────────
export default function UserFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate   = useNavigate()
  const queryClient = useQueryClient()

  // ── Load user data when editing ──────────────────────────────────
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await api.get<{ user: ApiUser }>(`/users/${id}`)
      return res.data.user
    },
    enabled: isEditing,
  })

  // ── Load areas for dropdown ──────────────────────────────────────
  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await api.get<AreasResponse>('/areas')
      return res.data.areas
    },
  })

  // ── Form ─────────────────────────────────────────────────────────
  const schema = isEditing ? editSchema : createSchema

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'staff', position_role: 'soporte' },
  })

  // Populate form once user data arrives
  useEffect(() => {
    if (userData) {
      reset({
        nombre:        userData.nombre,
        apellido:      userData.apellido,
        email:         userData.email,
        dni:           userData.dni,
        telefono:      userData.telefono ?? '',
        role:          userData.role,
        area_id:       userData.area_id ? String(userData.area_id) : '',
        position_role: (userData.cargo as EditForm['position_role']) ?? 'soporte',
        password:              '',
        password_confirmation: '',
      })
    }
  }, [userData, reset])

  // ── Mutations ─────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.post('/users', { user: { ...values, area_id: (values.area_id || undefined) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario creado exitosamente')
      navigate('/gestion/usuarios')
    },
    onError: (err: any) => applyServerErrors(err),
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.patch(`/users/${id}`, { user: { ...values, area_id: (values.area_id || undefined) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      toast.success('Usuario actualizado exitosamente')
      navigate('/gestion/usuarios')
    },
    onError: (err: any) => applyServerErrors(err),
  })

  function applyServerErrors(err: any) {
    const msgs: string[] = err?.response?.data?.errors ?? []
    if (msgs.length) {
      setError('root', { message: msgs.join(' | ') })
    } else {
      toast.error('Ocurrió un error inesperado')
    }
  }

  const onSubmit = (values: FormValues) => {
    if (isEditing) updateMutation.mutate(values)
    else createMutation.mutate(values)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEditing && loadingUser) {
    return (
      <div className={styles.page}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Cargando usuario…</p>
      </div>
    )
  }

  const fullName = userData
    ? `${userData.nombre} ${userData.apellido}`
    : ''

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/gestion/usuarios">Usuarios</Link>
        <ChevronRight size={13} />
        <span>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <h1>{isEditing ? `Editar: ${fullName}` : 'Nuevo Usuario'}</h1>
        <p>
          {isEditing
            ? 'Modifica los datos del usuario.'
            : 'Completa los datos para registrar un nuevo usuario en el sistema.'}
        </p>
      </div>

      {/* Card */}
      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>

          {/* Server errors */}
          {errors.root && (
            <div className={styles.serverErrors}>
              <p>No se pudo guardar el usuario:</p>
              <ul>
                {errors.root.message?.split(' | ').map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Datos personales ── */}
          <p className={styles.sectionLabel}>Datos personales</p>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Nombre <span className={styles.required}>*</span></label>
              <input
                type="text"
                className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
                placeholder="Juan"
                {...register('nombre')}
              />
              {errors.nombre && <span className={styles.errorMsg}>{errors.nombre.message}</span>}
            </div>

            <div className={styles.field}>
              <label>Apellido <span className={styles.required}>*</span></label>
              <input
                type="text"
                className={`${styles.input} ${errors.apellido ? styles.inputError : ''}`}
                placeholder="Pérez"
                {...register('apellido')}
              />
              {errors.apellido && <span className={styles.errorMsg}>{errors.apellido.message}</span>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Correo electrónico <span className={styles.required}>*</span></label>
              <input
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="usuario@empresa.com"
                {...register('email')}
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email.message}</span>}
            </div>

            <div className={styles.field}>
              <label>DNI <span className={styles.required}>*</span></label>
              <input
                type="text"
                className={`${styles.input} ${errors.dni ? styles.inputError : ''}`}
                placeholder="12345678"
                maxLength={8}
                {...register('dni')}
              />
              {errors.dni && <span className={styles.errorMsg}>{errors.dni.message}</span>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Teléfono</label>
              <input
                type="tel"
                className={styles.input}
                placeholder="987654321"
                {...register('telefono')}
              />
            </div>

            <div className={styles.field}>
              <label>Rol del sistema <span className={styles.required}>*</span></label>
              <select className={styles.select} {...register('role')}>
                <option value="staff">Personal</option>
                <option value="manager">Gestor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          {/* ── Área y cargo ── */}
          <p className={styles.sectionLabel}>Área y cargo</p>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Área principal</label>
              <select className={styles.select} {...register('area_id')}>
                <option value="">Sin área</option>
                {(areasData ?? []).map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label>Cargo en el área</label>
              <select className={styles.select} {...register('position_role')}>
                <option value="soporte">Soporte</option>
                <option value="operador_linea">Operador de Línea</option>
                <option value="coordinador">Coordinador</option>
                <option value="jefe">Jefe</option>
              </select>
            </div>
          </div>

          {/* ── Contraseña ── */}
          <p className={styles.sectionLabel}>
            {isEditing ? 'Cambiar contraseña (opcional)' : 'Contraseña'}
          </p>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>
                {isEditing ? 'Nueva contraseña' : 'Contraseña'}
                {!isEditing && <span className={styles.required}>*</span>}
              </label>
              <input
                type="password"
                className={`${styles.input} ${'password' in errors && errors.password ? styles.inputError : ''}`}
                placeholder={isEditing ? 'Dejar vacío para no cambiar' : '••••••••'}
                {...register('password')}
              />
              {'password' in errors && errors.password && (
                <span className={styles.errorMsg}>{errors.password.message}</span>
              )}
            </div>

            <div className={styles.field}>
              <label>
                Confirmar contraseña
                {!isEditing && <span className={styles.required}>*</span>}
              </label>
              <input
                type="password"
                className={`${styles.input} ${'password_confirmation' in errors && errors.password_confirmation ? styles.inputError : ''}`}
                placeholder="••••••••"
                {...register('password_confirmation')}
              />
              {'password_confirmation' in errors && errors.password_confirmation && (
                <span className={styles.errorMsg}>{errors.password_confirmation.message}</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <Link to="/gestion/usuarios" className={styles.btnCancel}>
              Cancelar
            </Link>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isPending || isSubmitting}
            >
              <Save size={15} />
              {isPending
                ? isEditing ? 'Guardando…' : 'Creando…'
                : isEditing ? 'Guardar cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
