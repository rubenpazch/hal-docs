import styles from './StatusBadge.module.css'

// ── Document statuses ──────────────────────────────────────────────────────
const DOCUMENT_LABEL: Record<string, string> = {
  registrado: 'Registrado',
  en_proceso: 'En Proceso',
  derivado:   'Derivado',
  respondido: 'Respondido',
  archivado:  'Archivado',
  anulado:    'Anulado',
  devuelto:   'Devuelto',
  finalizado: 'Finalizado',
}

// ── Virtual-submission statuses ────────────────────────────────────────────
const SUBMISSION_LABEL: Record<string, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
}

// ── Digital-certificate statuses ──────────────────────────────────────────
const CERTIFICATE_LABEL: Record<string, string> = {
  valid:    'Vigente',
  expiring: 'Por vencer',
  expired:  'Vencido',
}

type Variant = 'document' | 'submission' | 'certificate'

interface Props {
  status: string
  variant?: Variant
  className?: string
}

function labelFor(status: string, variant: Variant): string {
  if (variant === 'submission')  return SUBMISSION_LABEL[status]  ?? status
  if (variant === 'certificate') return CERTIFICATE_LABEL[status] ?? status
  return DOCUMENT_LABEL[status] ?? status
}

export default function StatusBadge({ status, variant = 'document', className }: Props) {
  const label = labelFor(status, variant)
  return (
    <span
      className={`${styles.badge} ${className ?? ''}`}
      data-status={status}
      data-variant={variant}
    >
      {label}
    </span>
  )
}
