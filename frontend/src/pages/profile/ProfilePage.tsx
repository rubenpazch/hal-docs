import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User, Lock, Save } from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import styles from './ProfilePage.module.css'

// ── Schemas ────────────────────────────────────────────────────────────
const profileSchema = z.object({
  nombre:   z.string().min(1, 'Requerido'),
  apellido: z.string().min(1, 'Requerido'),
  telefono: z.string().optional(),
  cargo:    z.string().optional(),
})

const passwordSchema = z
  .object({
    current_password:      z.string().min(1, 'Requerido'),
    password:              z.string().min(6, 'Mínimo 6 caracteres'),
    password_confirmation: z.string().min(1, 'Requerido'),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

const ROLE_LABEL: Record<string, string> = {
  admin:   'Administrador',
  manager: 'Gerente',
  staff:   'Personal',
}

// ── Page ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: errProfile },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nombre:   user?.nombre ?? '',
      apellido: user?.apellido ?? '',
      telefono: user?.telefono ?? '',
      cargo:    user?.cargo ?? '',
    },
  })

  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    formState: { errors: errPwd },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const updateProfile = useMutation({
    mutationFn: (data: ProfileForm) => api.patch('/me', { user: data }),
    onSuccess: (res) => {
      toast.success('Perfil actualizado')
      if (token) setAuth(res.data.user, token)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('No se pudo actualizar el perfil'),
  })

  const updatePassword = useMutation({
    mutationFn: (data: PasswordForm) => api.patch('/me/password', data),
    onSuccess: () => {
      toast.success('Contraseña actualizada')
      resetPwd()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error ?? 'No se pudo cambiar la contraseña'
      toast.error(msg)
    },
  })

  const initials = user ? `${user.nombre[0]}${user.apellido[0]}`.toUpperCase() : 'U'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.avatar}>{initials}</div>
        <div>
          <h1 className={styles.name}>{user?.full_name}</h1>
          <span className={styles.roleBadge} data-role={user?.role}>
            {ROLE_LABEL[user?.role ?? 'staff']}
          </span>
          {user?.area && <span className={styles.area}>{user.area}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <User size={16} /> Información personal
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'password' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('password')}
        >
          <Lock size={16} /> Cambiar contraseña
        </button>
      </div>

      {/* Tab: profile info */}
      {activeTab === 'info' && (
        <form className={styles.form} onSubmit={handleProfile((d) => updateProfile.mutate(d))}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Nombre</label>
              <input {...regProfile('nombre')} />
              {errProfile.nombre && <span className={styles.err}>{errProfile.nombre.message}</span>}
            </div>
            <div className={styles.field}>
              <label>Apellido</label>
              <input {...regProfile('apellido')} />
              {errProfile.apellido && <span className={styles.err}>{errProfile.apellido.message}</span>}
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Teléfono</label>
              <input {...regProfile('telefono')} placeholder="Opcional" />
            </div>
            <div className={styles.field}>
              <label>Cargo</label>
              <input {...regProfile('cargo')} placeholder="Opcional" />
            </div>
          </div>
          <div className={styles.fieldReadonly}>
            <label>Correo electrónico</label>
            <span>{user?.email}</span>
          </div>
          <div className={styles.fieldReadonly}>
            <label>DNI</label>
            <span>{user?.dni ?? '—'}</span>
          </div>
          <button type="submit" className={styles.btn} disabled={updateProfile.isPending}>
            <Save size={16} />
            {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* Tab: change password */}
      {activeTab === 'password' && (
        <form className={styles.form} onSubmit={handlePwd((d) => updatePassword.mutate(d))}>
          <div className={styles.field}>
            <label>Contraseña actual</label>
            <input type="password" {...regPwd('current_password')} />
            {errPwd.current_password && <span className={styles.err}>{errPwd.current_password.message}</span>}
          </div>
          <div className={styles.field}>
            <label>Nueva contraseña</label>
            <input type="password" {...regPwd('password')} />
            {errPwd.password && <span className={styles.err}>{errPwd.password.message}</span>}
          </div>
          <div className={styles.field}>
            <label>Confirmar nueva contraseña</label>
            <input type="password" {...regPwd('password_confirmation')} />
            {errPwd.password_confirmation && (
              <span className={styles.err}>{errPwd.password_confirmation.message}</span>
            )}
          </div>
          <button type="submit" className={styles.btn} disabled={updatePassword.isPending}>
            <Lock size={16} />
            {updatePassword.isPending ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>
      )}
    </div>
  )
}
