import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar/Sidebar'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const { isAuthenticated, setPermissions } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    api.get<{ permissions: Record<string, boolean> }>('/role_permissions/my_permissions')
      .then((res) => setPermissions(res.data.permissions))
      .catch(() => {/* keep existing permissions on error */})
  }, [isAuthenticated, setPermissions])

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
