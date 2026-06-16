import { useAuthStore } from '@/store/authStore'

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
        Bienvenido, {user?.nombre}
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
        Panel de control del Sistema de Trámite Documentario.
      </p>
    </div>
  )
}
