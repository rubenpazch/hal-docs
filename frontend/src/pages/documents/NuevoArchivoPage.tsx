import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { ArrowLeft, Upload, FileText, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import styles from './NuevoArchivoPage.module.css'

interface DocumentType {
  id: number
  name: string
  code: string
}

const schema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  document_type_id: z.string().min(1, 'Selecciona un tipo de documento'),
})

type ArchivoForm = z.infer<typeof schema>

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

export default function NuevoArchivoPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ArchivoForm>({
    resolver: zodResolver(schema),
  })

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['document-types'],
    queryFn: async () => {
      const res = await api.get<{ document_types: DocumentType[] }>('/document_types')
      return res.data.document_types
    },
  })

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (rejections) => {
      rejections.forEach((r) =>
        toast.error(`${r.file.name}: ${r.errors[0]?.message ?? 'Archivo rechazado'}`)
      )
    },
  })

  const onSubmit = async (data: ArchivoForm) => {
    if (!file) {
      toast.error('Debes adjuntar un archivo')
      return
    }
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('archivo[nombre]', data.nombre)
      formData.append('archivo[document_type_id]', data.document_type_id)
      formData.append('archivo[file]', file)

      await api.post('/archivos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Documento subido al repositorio')
      reset()
      setFile(null)
      navigate('/documentos')
    } catch (err: unknown) {
      const errors = (err as { response?: { data?: { errors?: string[] } } })
        ?.response?.data?.errors
      toast.error(errors?.[0] ?? 'Ocurrió un error al subir el documento')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </button>
        <div className={styles.pageHeaderText}>
          <h1>Subir Documento al Repositorio</h1>
          <p>El documento quedará disponible para vincularlo a trámites</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.card}>
          <p className={styles.sectionTitle}>Datos del documento</p>
          <div className={styles.formGrid}>
            {/* Nombre */}
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label>Nombre del documento <span>*</span></label>
              <input
                type="text"
                placeholder="Ej. Informe técnico enero 2025"
                {...register('nombre')}
                className={errors.nombre ? styles.inputError : ''}
              />
              {errors.nombre && <span className={styles.fieldError}>{errors.nombre.message}</span>}
            </div>

            {/* Tipo de documento */}
            <div className={styles.formField}>
              <label>Tipo de documento <span>*</span></label>
              <select
                {...register('document_type_id')}
                className={errors.document_type_id ? styles.inputError : ''}
              >
                <option value="">Seleccionar...</option>
                {documentTypes.map((dt) => (
                  <option key={dt.id} value={String(dt.id)}>
                    {dt.name} ({dt.code})
                  </option>
                ))}
              </select>
              {errors.document_type_id && (
                <span className={styles.fieldError}>{errors.document_type_id.message}</span>
              )}
            </div>
          </div>

          {/* Dropzone */}
          <p className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>Archivo</p>
          {!file ? (
            <div
              {...getRootProps()}
              className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={28} strokeWidth={1.4} />
              <p className={styles.dropzoneTitle}>
                {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para seleccionar'}
              </p>
              <p className={styles.dropzoneHint}>PDF, DOC, DOCX — máximo 20 MB</p>
            </div>
          ) : (
            <div className={styles.filePreview}>
              <FileText size={18} className={styles.fileIcon} />
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                className={styles.removeFile}
                onClick={() => setFile(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Submit */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 size={14} className={styles.spin} /> Subiendo...</>
              ) : (
                <><Upload size={14} /> Subir documento</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
