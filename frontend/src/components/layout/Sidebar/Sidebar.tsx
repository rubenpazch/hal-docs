import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Files,
  Clock,
  Upload,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Tag,
  ShieldCheck,
  Inbox,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'
import styles from './Sidebar.module.css'

interface SubMenuItem {
  label: string
  to: string
}

interface MenuItem {
  label: string
  icon: React.ReactNode
  to?: string
  children?: SubMenuItem[]
  pageKey?: string          // matches RolePermission::PAGE_KEYS
  section?: string
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    to: '/dashboard',
    pageKey: 'dashboard',
    section: 'Principal',
  },
  {
    label: 'Trámites',
    icon: <FileText size={18} />,
    pageKey: 'tramites',
    section: 'Gestión',
    children: [
      { label: 'Nuevo Trámite', to: '/tramites/nuevo' },
      { label: 'Mis Trámites', to: '/tramites/mis-tramites' },
      { label: 'Todos los Trámites', to: '/tramites' },
      { label: 'Por Vencer', to: '/tramites/por-vencer' },
      { label: 'Flujo Documentario', to: '/tramites/flujo' },
    ],
  },
  {
    label: 'Documentos',
    icon: <Files size={18} />,
    pageKey: 'documentos',
    children: [
      { label: 'Cargar Documento', to: '/documentos/cargar' },
      { label: 'Todos los Documentos', to: '/documentos' },
    ],
  },
  {
    label: 'Pendientes',
    icon: <Clock size={18} />,
    to: '/pendientes',
    pageKey: 'pendientes',
  },
  {
    label: 'Archivo',
    icon: <Upload size={18} />,
    to: '/archivo',
    pageKey: 'archivo',
  },
  {
    label: 'Usuarios',
    icon: <Users size={18} />,
    to: '/gestion/usuarios',
    pageKey: 'usuarios',
    section: 'Administración',
  },
  {
    label: 'Áreas',
    icon: <Building2 size={18} />,
    to: '/gestion/areas',
    pageKey: 'areas',
  },
  {
    label: 'Tipos de Doc.',
    icon: <Tag size={18} />,
    to: '/gestion/tipos-documento',
    pageKey: 'tipos_doc',
  },
  {
    label: 'Mis Certificados',
    icon: <ShieldCheck size={18} />,
    to: '/mis-certificados',
    pageKey: 'mis_certificados',
    section: 'Mi Cuenta',
  },
  {
    label: 'Mis Derivados',
    icon: <Inbox size={18} />,
    to: '/bandeja/derivados',
    pageKey: 'mis_derivados',
    section: 'Mi Bandeja',
  },
  {
    label: 'Mesa Virtual',
    icon: <Inbox size={18} />,
    pageKey: 'mesa_virtual_admin',
    section: 'Administración',
    children: [
      { label: 'Todos los trámites', to: '/admin/mesa-virtual' },
    ],
  },
  {
    label: 'Accesos y Permisos',
    icon: <KeyRound size={18} />,
    to: '/admin/accesos',
    pageKey: 'accesos',
    section: 'Administración',
  },
  {
    label: 'Reportes',
    icon: <BarChart3 size={18} />,
    to: '/reportes',
    pageKey: 'reportes',
    section: 'Análisis',
  },
  {
    label: 'Configuración',
    icon: <Settings size={18} />,
    to: '/configuracion',
    pageKey: 'configuracion',
  },
]

export default function Sidebar() {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const { user, clearAuth, hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Auto-expand menus whose children match the current path
  const isMenuOpen = (item: MenuItem) => {
    if (openMenus[item.label] !== undefined) return openMenus[item.label]
    return item.children?.some((c) => location.pathname.startsWith(c.to)) ?? false
  }

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      clearAuth()
      toast.success('Sesión cerrada')
      navigate('/login')
    }
  }

  const userRole = user?.role ?? 'staff'
  const visibleItems = menuItems.filter(
    (item) => !item.pageKey || hasPermission(item.pageKey)
  )

  const initials = user
    ? `${user.nombre[0]}${user.apellido[0]}`
    : 'U'

  // Group by section
  const sections: { label: string; items: MenuItem[] }[] = []
  let currentSection: { label: string; items: MenuItem[] } | null = null

  for (const item of visibleItems) {
    const prevLabel: string | undefined = currentSection ? currentSection.label : undefined
    if (item.section && item.section !== prevLabel) {
      const existing = sections.find((s) => s.label === item.section)
      if (existing) {
        currentSection = existing
      } else {
        currentSection = { label: item.section, items: [] }
        sections.push(currentSection)
      }
    }
    if (currentSection) {
      currentSection.items.push(item)
    } else {
      const defaultSection = { label: '', items: [item] }
      sections.push(defaultSection)
      currentSection = defaultSection
    }
  }

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gestor',
    staff: 'Personal',
  }

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <FileText size={18} color="#fff" />
        </div>
        <div className={styles.brandText}>
          <div className={styles.brandTitle}>Trámite Doc.</div>
          <div className={styles.brandSubtitle}>Sistema de Gestión</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {sections.map((section) => (
          <div key={section.label}>
            {section.label && (
              <div className={styles.sectionLabel}>{section.label}</div>
            )}
            {section.items.map((item) => {
              if (item.children) {
                const isOpen = isMenuOpen(item)
                return (
                  <div key={item.label}>
                    <button
                      className={styles.navItem}
                      onClick={() => toggleMenu(item.label)}
                      type="button"
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      <span className={styles.navLabel}>{item.label}</span>
                      <ChevronRight
                        size={14}
                        className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className={styles.submenu}>
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `${styles.submenuItem} ${isActive ? styles.submenuItemActive : ''}`
                            }
                          >
                            <span className={styles.submenuDot} />
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to!}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <NavLink to="/mi-perfil" className={styles.profileLink}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.full_name}</div>
            <div className={styles.userRole}>{roleLabel[userRole]}</div>
          </div>
        </NavLink>
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          title="Cerrar sesión"
          type="button"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
