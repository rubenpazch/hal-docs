export interface SystemRole {
  id: number
  name: string
  display_name: string
  color: string
  bg_color: string
  is_system: boolean
  deletable: boolean
  created_at: string
}

export interface PermissionsMatrix {
  permissions: Record<string, Record<string, boolean>>
  page_keys: string[]
  roles: SystemRole[]
}
