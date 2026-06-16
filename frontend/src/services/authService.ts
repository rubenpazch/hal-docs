import api from '@/lib/api'
import type { LoginCredentials, AuthResponse } from '@/types/auth'

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthResponse['user']; token: string }> {
    const response = await api.post<AuthResponse>('/auth/login', {
      user: credentials,
    })
    const token = response.headers['authorization']?.split(' ')[1] ?? ''
    return { user: response.data.user, token }
  },

  async logout(): Promise<void> {
    await api.delete('/auth/logout')
  },
}
