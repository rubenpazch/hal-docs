import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChevronRight, Save } from 'lucide-react'
import api from '@/lib/api'
import type { Area, AreasResponse, AreaType } from '@/types/area'
import styles from './AreaFormPage.module.css'

// ── Schema ────────────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  area_type:   z.enum(['gerencia', 'departamento', 'equipo', 'unidad']),
  parent_id:   z.number().nullable(),
})

type FormValues = z.infer<typeof schema>

// ── Type options ───────────────────────────────────────────────────────
const TYPE_OPTIONS: { value: AreaType; label: string; icon: string; description: string }[] = [
  { value: 'gerencia',     label: 'Gerencia',     icon: '🏛️', description: 'Nivel superior' },
  { value: 'departamento', label: 'Departamento', icon: '🏢', description: 'División funcional' },
  { value: 'equipo',       label: 'Equipo',       icon: '👥', description: 'Grupo de trabajo' },
  { value: 'unidad',       label: 'Unidad',       icon: '📌', description: 'Unidad operativa' },
]

// ── Component ─────────────────────────────────────────────────────────
export default function AreaFormPage() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // ── Load area for editing ────────────────────────────────────────
  const { data: areaData, isLoading: loadingArea } = useQuery({
    queryKey: ['area', id],
    queryFn: async () => {
      const res = await api.get<{ area: Area }>(`/areas/${id}`)
      return res.data.area
    },
    enabled: isEditing,
  })

  // ── Load all areas for parent dropdown ───────────────────────────
  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await api.get<AreasResponse>('/areas')
      return res.data
    },
  })

  function flattenForSelect(areas: Area[], depth = 0): { id: number; label: string }[] {
    return areas.flatMap((a) => [
      { id: a.id, label: '—'.repeat(depth) + ' ' + a.name },
      ...(a.children ? flattenForSelect(a.children, depth + 1) : []),
    ])
  }

  const parentOptions = areasData
    ? flattenForSelect(areasData.areas).filter((a) => !id || a.id !== Number(id))
    : []

  // ── Form ─────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        '',
      description: '',
      area_type:   'departamento',
      parent_id:   null,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (areaData) {
      reset({
        name:        areaData.name,
        description: areaData.description ?? '',
        area_type:   areaData.area_type,
        parent_id:   areaData.parent_id,
      })
    }
  }, [areaData, reset])

  // ── Mutations ─────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.post('/areas', { area: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      toast.success('Área creada exitosamente')
      navigate('/gestion/areas')
    },
    onError: (err: any) => handleServerErrors(err),
  })

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.patch(`/areas/${id}`, { area: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      queryClient.invalidateQueries({ queryKey: ['area', id] })
      toast.success('Área actualizada exitosamente')
      navigate('/gestion/areas')
    },
    onError: (err: any) => handleServerErrors(err),
  })

  function handleServerErrors(err: any) {
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

  if (isEditing && loadingArea) {
    return (
      <div className={styles.page}>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Cargando área…</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/gestion/areas">Áreas</Link>
        <ChevronRight size={13} />
        <span>{isEditing ? 'Editar área' : 'Nueva área'}</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <h1>{isEditing ? `Editar: ${areaData?.name ?? ''}` : 'Nueva Área'}</h1>
        <p>
          {isEditing
            ? 'Modifica los datos del área organizacional.'
            : 'Completa los datos para registrar una nueva área en el sistema.'}
        </p>
      </div>

      {/* Card */}
      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>

          {/* Server errors */}
          {errors.root && (
            <div className={styles.serverErrors}>
              <p>No se pudo guardar el área:</p>
              <ul>
                {errors.root.message?.split(' | ').map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Name */}
          <div className={styles.field}>
            <label>Nombre del Área <span className={styles.required}>*</span></label>
            <input
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              placeholder="Ej. Gerencia General, Recursos Humanos…"
              {...register('name')}
            />
            {errors.name && <span className={styles.errorMsg}>{errors.name.message}</span>}
          </div>

          {/* Type selector */}
          <div className={styles.field}>
            <label>Tipo de Área <span className={styles.required}>*</span></label>
            <Controller
              control={control}
              name="area_type"
              render={({ field }) => (
                <div className={styles.typeGrid}>
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.typeOption} ${field.value === opt.value ? styles.typeOptionSelected : ''}`}
                      onClick={() => field.onChange(opt.value)}
                    >
                      <span className={styles.typeOptionIcon}>{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span style={{ fontSize: 11, color: 'inherit', opacity: 0.7 }}>{opt.description}</span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Parent area + description (2 cols) */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Área Padre</label>
              <Controller
                control={control}
                name="parent_id"
                render={({ field }) => (
                  <select
                    className={styles.select}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                  >
                    <option value="">— Sin área padre —</option>
                    {parentOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                )}
              />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Dejar vacío si es nivel raíz (ej. Gerencia General).
              </span>
            </div>

            <div className={styles.field}>
              <label>Descripción</label>
              <textarea
                className={styles.textarea}
                placeholder="Funciones u observaciones del área…"
                {...register('description')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <Link to="/gestion/areas" className={styles.btnCancel}>
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
                : isEditing ? 'Guardar cambios' : 'Crear Área'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
