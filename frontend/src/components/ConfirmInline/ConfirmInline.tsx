import { AlertTriangle, Loader2 } from 'lucide-react'
import styles from './ConfirmInline.module.css'

interface ConfirmInlineProps {
  /** Short message shown next to the buttons */
  message: string
  /** Label for the confirm button. Defaults to "Confirmar". */
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

/**
 * Renders an inline, non-modal confirmation strip.
 * Drop it wherever a destructive action needs user confirmation
 * without a browser alert or a floating dialog.
 */
export default function ConfirmInline({
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmInlineProps) {
  return (
    <div className={styles.wrap} role="alertdialog" aria-label={message}>
      <AlertTriangle size={14} className={styles.icon} aria-hidden />
      <span className={styles.message}>{message}</span>

      <button
        type="button"
        className={styles.btnCancel}
        onClick={onCancel}
        disabled={loading}
      >
        Cancelar
      </button>

      <button
        type="button"
        className={styles.btnConfirm}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading && <Loader2 size={12} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  )
}
