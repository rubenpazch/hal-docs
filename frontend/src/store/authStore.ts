import { create } from 'zustand'
import type { User } from '@/types/auth'

export type PagePermissions = Record<string, boolean>

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  permissions: PagePermissions
  setAuth: (user: User, token: string) => void
  setPermissions: (permissions: PagePermissions) => void
  clearAuth: () => void
  hasPermission: (pageKey: string) => boolean
}

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem('auth_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const getStoredPermissions = (): PagePermissions => {
  try {
    const stored = localStorage.getItem('auth_permissions')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: localStorage.getItem('auth_token'),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  permissions: getStoredPermissions(),

  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  setPermissions: (permissions) => {
    localStorage.setItem('auth_permissions', JSON.stringify(permissions))
    set({ permissions })
  },

  clearAuth: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_permissions')
    set({ user: null, token: null, isAuthenticated: false, permissions: {} })
  },

  hasPermission: (pageKey: string) => {
    const { permissions } = get()
    // If permissions haven't loaded yet, default to true to avoid blank menus
    if (Object.keys(permissions).length === 0) return true
    return permissions[pageKey] === true
  },
}))
