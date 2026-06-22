import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, User, FileText, CheckCircle, Building2, Upload, X, AlertCircle } from 'lucide-react'
import { mesaVirtualService, type SubmitTramitePayload } from '@/services/mesaVirtualService'
import type { SubmitterType } from '@/types/document'
import styles from './NuevoTramitePage.module.css'

// ── Step labels ──────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Datos del Remitente', icon: User },
  { label: 'Datos del Documento', icon: FileText },
  { label: 'Confirmación', icon: CheckCircle },
]

// ── Initial form state ────────────────────────────────────────────────────────
const INITIAL: SubmitTramitePayload = {
  submitter_type: 'natural',
  submitter_name: '',
  submitter_document: '',
  submitter_email: '',
  submitter_phone: '',
  submitter_address: '',
  company_name: '',
  representative_name: '',
  document_type_id: 0,
  subject: '',
  observations: '',
  folio_count: undefined,
  attachments: [],
}

export default function NuevoTramitePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<SubmitTramitePayload>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [trackingNumber, setTrackingNumber] = useState('')
  const [receivedAt, setReceivedAt] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: documentTypes = [] } = useQuery({
    queryKey: ['mesa-virtual-doc-types'],
    queryFn: mesaVirtualService.getDocumentTypes,
  })

  const submitMutation = useMutation({
    mutationFn: mesaVirtualService.submit,
    onSuccess: (data) => {
      setTrackingNumber(data.submission.tracking_number)
      setReceivedAt(data.submission.received_at)
      setStep(2)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { errors?: string[] } } })
        ?.response?.data?.errors?.join(', ') ?? 'Ocurrió un error al registrar el trámite'
      toast.error(msg)
    },
  })

  function set<K extends keyof SubmitTramitePayload>(key: K, val: SubmitTramitePayload[K]) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  // ── Validation per step ─────────────────────────────────────────────────────
  function validateStep0() {
    const errs: Record<string, string> = {}
    if (!form.submitter_name.trim()) errs.submitter_name = 'Nombre completo es obligatorio'
    if (!form.submitter_document.trim()) errs.submitter_document = 'Número de documento es obligatorio'
    if (!/^\d{8,11}$/.test(form.submitter_document.trim()))
      errs.submitter_document = 'Ingrese un DNI (8 dígitos) o RUC (11 dígitos) válido'
    if (!form.submitter_email.trim()) errs.submitter_email = 'Correo electrónico es obligatorio'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitter_email.trim()))
      errs.submitter_email = 'Ingrese un correo electrónico válido'
    if (form.submitter_type === 'juridica') {
      if (!form.company_name?.trim()) errs.company_name = 'Razón social es obligatoria'
      if (!form.representative_name?.trim()) errs.representative_name = 'Representante legal es obligatorio'
    }
    return errs
  }

  function validateStep1() {
    const errs: Record<string, string> = {}
    if (!form.document_type_id || form.document_type_id === 0)
      errs.document_type_id = 'Seleccione un tipo de documento'
    if (!form.subject.trim()) errs.subject = 'Asunto es obligatorio'
    if (form.subject.trim().length > 200)
      errs.subject = 'El asunto no puede superar los 200 caracteres'
    if (!form.attachments || form.attachments.length === 0)
      errs.attachments = 'Debe adjuntar el documento principal en formato PDF'
    return errs
  }

  function handleNext() {
    const errs = step === 0 ? validateStep0() : validateStep1()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setStep((s) => s + 1)
  }

  function handleSubmit() {
    submitMutation.mutate(form)
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const pdf = files[0]
    if (pdf.type !== 'application/pdf') {
      setErrors((e) => ({ ...e, attachments: 'Solo se aceptan archivos PDF' }))
      return
    }
    if (pdf.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, attachments: 'El archivo no debe superar 5 MB' }))
      return
    }
    set('attachments', [pdf])
    setErrors((e) => { const n = { ...e }; delete n.attachments; return n })
  }

  return (
    <div className={styles.page}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.backBtn} onClick={() => navigate('/mesa-virtual')}>
            <ChevronLeft size={16} /> Mesa Virtual
          </button>
          <span className={styles.headerTitle}>Nuevo Registro de Documento</span>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.hint}>
          Los campos marcados con (*) son obligatorios. El documento principal debe estar en
          formato PDF y no debe exceder los 5 MB.
        </p>

        {/* ── Stepper ──────────────────────────────────────────────── */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const state = i < step ? 'done' : i === step ? 'active' : 'pending'
            return (
              <div key={s.label} className={styles.stepItem} data-state={state}>
                <div className={styles.stepCircle} data-state={state}>
                  {state === 'done' ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>
                <span className={styles.stepLabel}>{s.label}</span>
                {i < STEPS.length - 1 && <div className={styles.stepLine} data-state={i < step ? 'done' : 'pending'} />}
              </div>
            )
          })}
        </div>

        {/* ── Step content ─────────────────────────────────────────── */}
        <div className={styles.card}>

          {/* Step 0 — Datos del remitente */}
          {step === 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Datos del Remitente</h2>

              {/* Persona natural / jurídica toggle */}
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={form.submitter_type === 'natural'}
                  onClick={() => set('submitter_type', 'natural' as SubmitterType)}
                >
                  <User size={16} /> Persona Natural
                </button>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  data-active={form.submitter_type === 'juridica'}
                  onClick={() => set('submitter_type', 'juridica' as SubmitterType)}
                >
                  <Building2 size={16} /> Persona Jurídica
                </button>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>
                    Nombre completo{form.submitter_type === 'natural' ? '' : ' del representante'} (*)
                  </label>
                  <input
                    value={form.submitter_name}
                    onChange={(e) => set('submitter_name', e.target.value)}
                    placeholder="Ingrese nombre completo"
                    className={errors.submitter_name ? styles.inputError : ''}
                  />
                  {errors.submitter_name && <span className={styles.errorMsg}>{errors.submitter_name}</span>}
                </div>

                <div className={styles.field}>
                  <label>
                    {form.submitter_type === 'natural' ? 'DNI' : 'RUC'} (*)
                  </label>
                  <input
                    value={form.submitter_document}
                    onChange={(e) => set('submitter_document', e.target.value.replace(/\D/g, ''))}
                    placeholder={form.submitter_type === 'natural' ? '8 dígitos' : '11 dígitos'}
                    maxLength={form.submitter_type === 'natural' ? 8 : 11}
                    className={errors.submitter_document ? styles.inputError : ''}
                  />
                  {errors.submitter_document && <span className={styles.errorMsg}>{errors.submitter_document}</span>}
                </div>

                <div className={styles.field}>
                  <label>Correo electrónico (*)</label>
                  <input
                    type="email"
                    value={form.submitter_email}
                    onChange={(e) => set('submitter_email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className={errors.submitter_email ? styles.inputError : ''}
                  />
                  {errors.submitter_email && <span className={styles.errorMsg}>{errors.submitter_email}</span>}
                </div>

                <div className={styles.field}>
                  <label>Teléfono de contacto</label>
                  <input
                    value={form.submitter_phone ?? ''}
                    onChange={(e) => set('submitter_phone', e.target.value)}
                    placeholder="Ej: 987654321"
                  />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Dirección</label>
                  <input
                    value={form.submitter_address ?? ''}
                    onChange={(e) => set('submitter_address', e.target.value)}
                    placeholder="Ingrese su dirección"
                  />
                </div>

                {/* Persona jurídica extra fields */}
                {form.submitter_type === 'juridica' && (
                  <>
                    <div className={styles.field}>
                      <label>Razón social (*)</label>
                      <input
                        value={form.company_name ?? ''}
                        onChange={(e) => set('company_name', e.target.value)}
                        placeholder="Nombre de la empresa"
                        className={errors.company_name ? styles.inputError : ''}
                      />
                      {errors.company_name && <span className={styles.errorMsg}>{errors.company_name}</span>}
                    </div>
                    <div className={styles.field}>
                      <label>Representante legal (*)</label>
                      <input
                        value={form.representative_name ?? ''}
                        onChange={(e) => set('representative_name', e.target.value)}
                        placeholder="Nombre del representante legal"
                        className={errors.representative_name ? styles.inputError : ''}
                      />
                      {errors.representative_name && <span className={styles.errorMsg}>{errors.representative_name}</span>}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 1 — Datos del documento */}
          {step === 1 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Datos del Documento</h2>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label>Tipo de Documento (*)</label>
                  <select
                    value={form.document_type_id}
                    onChange={(e) => set('document_type_id', Number(e.target.value))}
                    className={errors.document_type_id ? styles.inputError : ''}
                  >
                    <option value={0}>Seleccionar</option>
                    {documentTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                  {errors.document_type_id && <span className={styles.errorMsg}>{errors.document_type_id}</span>}
                </div>

                <div className={styles.field}>
                  <label>Número de folios</label>
                  <input
                    type="number"
                    min={1}
                    value={form.folio_count ?? ''}
                    onChange={(e) => set('folio_count', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Opcional"
                  />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Asunto del Documento (máx. 200 caracteres) (*)</label>
                  <input
                    value={form.subject}
                    onChange={(e) => set('subject', e.target.value)}
                    placeholder="Ingrese el asunto del documento"
                    maxLength={200}
                    className={errors.subject ? styles.inputError : ''}
                  />
                  <span className={styles.charCount}>{form.subject.length}/200</span>
                  {errors.subject && <span className={styles.errorMsg}>{errors.subject}</span>}
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>Observaciones</label>
                  <textarea
                    value={form.observations ?? ''}
                    onChange={(e) => set('observations', e.target.value)}
                    placeholder="Información adicional (opcional)"
                    rows={3}
                  />
                </div>

                {/* File upload */}
                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label>
                    Documento Principal — solo PDF, máximo 5 MB (*)
                  </label>
                  <div
                    className={`${styles.dropzone} ${errors.attachments ? styles.dropzoneError : ''}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                  >
                    {form.attachments && form.attachments.length > 0 ? (
                      <div className={styles.filePreview}>
                        <FileText size={20} />
                        <span>{form.attachments[0].name}</span>
                        <button
                          type="button"
                          className={styles.removeFile}
                          onClick={(e) => { e.stopPropagation(); set('attachments', []) }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.dropzonePrompt}>
                        <Upload size={28} />
                        <p>Haga clic o arrastre su PDF aquí</p>
                        <span>Solo PDF · Máx. 5 MB</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className={styles.hiddenInput}
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  {errors.attachments && (
                    <span className={styles.errorMsg}>
                      <AlertCircle size={14} /> {errors.attachments}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Confirmación / éxito */}
          {step === 2 && (
            <div className={styles.success}>
              <div className={styles.successIcon}><CheckCircle size={56} /></div>
              <h2 className={styles.successTitle}>Trámite Guardado</h2>
              <p className={styles.successBody}>
                Estimado/a <strong>{form.submitter_name}</strong>, su documento ha sido registrado
                con éxito. Pronto recibirá un correo de confirmación en{' '}
                <strong>{form.submitter_email}</strong>.
              </p>
              <div className={styles.trackingBox}>
                <span className={styles.trackingLabel}>Número de trámite</span>
                <span className={styles.trackingNumber}>{trackingNumber}</span>
                <span className={styles.trackingDate}>
                  Recibido:{' '}
                  {receivedAt
                    ? new Intl.DateTimeFormat('es-PE', {
                        dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima',
                      }).format(new Date(receivedAt))
                    : '—'}
                </span>
              </div>
              <p className={styles.successNote}>
                Guarde este número para consultar el estado de su trámite en{' '}
                <strong>Consultar Mis Trámites</strong>.
              </p>
              <div className={styles.successActions}>
                <button className={styles.btnPrimary} onClick={() => navigate('/mesa-virtual/consulta')}>
                  Consultar estado
                </button>
                <button className={styles.btnSecondary} onClick={() => { setForm(INITIAL); setStep(0) }}>
                  Registrar otro trámite
                </button>
              </div>
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────────────── */}
          {step < 2 && (
            <div className={styles.actions}>
              {step > 0 ? (
                <button className={styles.btnBack} onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft size={16} /> Anterior
                </button>
              ) : (
                <button className={styles.btnBack} onClick={() => navigate('/mesa-virtual')}>
                  <ChevronLeft size={16} /> Volver
                </button>
              )}

              {step === 0 && (
                <button className={styles.btnPrimary} onClick={handleNext}>
                  Siguiente <ChevronRight size={16} />
                </button>
              )}

              {step === 1 && (
                <button
                  className={styles.btnPrimary}
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? 'Guardando…' : 'Guardar Trámite'}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
