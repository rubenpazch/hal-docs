import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ChevronRight, Upload, FileKey2, Eye, EyeOff,
  X, CheckCircle2, ShieldCheck, Save,
} from 'lucide-react'
import api from '@/lib/api'
import type { DigitalCertificate } from '@/types/certificate'
import styles from './UploadCertificatePage.module.css'

// ── Schema ─────────────────────────────────────────────────────────────
const schema = z.object({
  alias_name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  password:   z.string().min(1, 'La contraseña del certificado es obligatoria'),
})

type FormValues = z.infer<typeof schema>

// ── Component ──────────────────────────────────────────────────────────
export default function UploadCertificatePage() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const [file, setFile]         = useState<File | null>(null)
  const [showPass, setShowPass] = useState(false)
  const [serverErrors, setServerErrors] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { alias_name: '', password: '' },
  })

  // ── Dropzone ──────────────────────────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setServerErrors([])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-pkcs12': ['.p12', '.pfx'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5 MB
    onDropRejected: () => toast.error('Solo se aceptan archivos .p12 o .pfx de hasta 5 MB.'),
  })

  // ── Mutation ──────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formData = new FormData()
      formData.append('digital_certificate[alias_name]', data.alias_name)
      formData.append('digital_certificate[password]',   data.password)
      formData.append('digital_certificate[certificate_file]', file!)

      const res = await api.post<{ certificate: DigitalCertificate; message: string }>(
        '/digital_certificates',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['digital-certificates'] })
      toast.success(data.message ?? 'Certificado registrado exitosamente')
      navigate('/mis-certificados')
    },
    onError: (err: any) => {
      const msgs: string[] = err?.response?.data?.errors ?? []
      if (msgs.length) {
        setServerErrors(msgs)
        // Surface password error inline if it's a passphrase issue
        if (msgs.some((m) => m.toLowerCase().includes('contraseña') || m.toLowerCase().includes('password'))) {
          setError('password', { message: msgs[0] })
        }
      } else {
        toast.error('Ocurrió un error inesperado')
      }
    },
  })

  const onSubmit = (values: FormValues) => {
    if (!file) {
      toast.error('Selecciona un archivo .p12 o .pfx')
      return
    }
    setServerErrors([])
    uploadMutation.mutate(values)
  }

  const dropzoneClass = [
    styles.dropzone,
    isDragActive ? styles.dropzoneActive : '',
    file ? styles.dropzoneHasFile : '',
  ].join(' ')

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link to="/mis-certificados">Mis Certificados</Link>
        <ChevronRight size={13} />
        <span>Agregar certificado</span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <h1>Agregar Certificado Digital</h1>
        <p>
          Sube tu certificado PKCS#12 (.p12 / .pfx) emitido por RENIEC u otra entidad
          certificadora reconocida. La contraseña no se almacena en el servidor.
        </p>
      </div>

      {/* Card */}
      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>

          {/* Server errors */}
          {serverErrors.length > 0 && (
            <div className={styles.serverErrors}>
              <p>No se pudo procesar el certificado:</p>
              <ul>{serverErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          {/* File drop zone */}
          <div className={styles.field}>
            <label>Archivo del certificado <span className={styles.required}>*</span></label>
            <div {...getRootProps()} className={dropzoneClass}>
              <input {...getInputProps()} />
              <div className={styles.dropzoneIcon}>
                {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
              </div>
              <p className={styles.dropzoneText}>
                {file
                  ? file.name
                  : isDragActive
                  ? 'Suelta el archivo aquí…'
                  : 'Arrastra tu archivo .p12 / .pfx o haz clic para seleccionar'}
              </p>
              {!file && (
                <p className={styles.dropzoneHint}>Solo .p12 / .pfx — máximo 5 MB</p>
              )}
            </div>
            {file && (
              <div className={styles.filePreview}>
                <FileKey2 size={15} />
                <span>{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
                <button type="button" onClick={() => setFile(null)} title="Quitar">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label>
              Contraseña del certificado <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                type={showPass ? 'text' : 'password'}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="Contraseña de tu .p12 / .pfx"
                {...register('password')}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className={styles.errorMsg}>{errors.password.message}</span>}
            <span className={styles.hint}>
              Usada solo para leer los datos del certificado. No se guarda en el servidor.
            </span>
          </div>

          {/* Alias */}
          <div className={styles.field}>
            <label>Nombre del certificado <span className={styles.required}>*</span></label>
            <input
              type="text"
              className={`${styles.input} ${errors.alias_name ? styles.inputError : ''}`}
              placeholder="Ej. Mi DNI digital, Certificado RENIEC 2024…"
              {...register('alias_name')}
            />
            {errors.alias_name && <span className={styles.errorMsg}>{errors.alias_name.message}</span>}
            <span className={styles.hint}>Un nombre fácil de identificar para este certificado.</span>
          </div>

          {/* What will be stored */}
          <div className={styles.certPreview}>
            <h4>¿Qué se almacenará?</h4>
            <div className={styles.certPreviewRow}>
              <span className={styles.certPreviewLabel}>Archivo:</span>
              <span>El archivo .p12 (cifrado en el servidor)</span>
            </div>
            <div className={styles.certPreviewRow}>
              <span className={styles.certPreviewLabel}>Datos:</span>
              <span>Nombre del titular, número de serie, emisor, fechas de vigencia</span>
            </div>
            <div className={styles.certPreviewRow}>
              <span className={styles.certPreviewLabel}>Contraseña:</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>❌ No se almacena — se solicitará al firmar</span>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <Link to="/mis-certificados" className={styles.btnCancel}>Cancelar</Link>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={uploadMutation.isPending || isSubmitting || !file}
            >
              {uploadMutation.isPending ? (
                <>Procesando…</>
              ) : (
                <><ShieldCheck size={15} /> <Save size={15} /> Guardar certificado</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
