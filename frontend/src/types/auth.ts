export interface User {
  id: number
  email: string
  nombre: string
  apellido: string
  full_name: string
  cargo?: string
  area?: string
  area_id?: number
  telefono?: string
  role: 'admin' | 'manager' | 'staff'
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  message: string
  user: User
}

export interface ApiError {
  message: string
  errors?: string[]
}
