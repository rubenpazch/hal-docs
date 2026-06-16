export type AreaType = 'gerencia' | 'departamento' | 'equipo' | 'unidad'

export interface Area {
  id: number
  name: string
  description: string | null
  area_type: AreaType
  parent_id: number | null
  children_count: number
  members_count: number
  created_at: string
  children?: Area[]
}

export interface AreaFormData {
  name: string
  description: string
  area_type: AreaType
  parent_id: number | null
}

export interface AreasResponse {
  areas: Area[]
  meta: { total: number }
}
