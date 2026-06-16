import { Link } from 'react-router-dom'
import { User, Building2, Calendar, Paperclip, ArrowRight } from 'lucide-react'
import { formatDistanceToNow, differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Document, DocumentPriority, DocumentStatus } from '@/types/document'
import styles from './DocumentCard.module.css'

// ── Label maps ─────────────────────────────────────────────────────────
const STATUS_LABEL: Record<DocumentStatus, string> = {
  registrado: 'Registrado',
  en_proceso: 'En Proceso',
  derivado: 'Derivado',
  respondido: 'Respondido',
  archivado: 'Archivado',
  anulado: 'Anulado',
}

const STATUS_CLASS: Record<DocumentStatus, string> = {
  registrado: styles.statusRegistrado,
  en_proceso: styles.statusEnProceso,
  derivado:   styles.statusDerivado,
  respondido: styles.statusRespondido,
  archivado:  styles.statusArchivado,
  anulado:    styles.statusAnulado,
}

const PRIORITY_LABEL: Record<DocumentPriority, string> = {
  baja:    'Baja',
  media:   'Media',
  alta:    'Alta',
  urgente: 'Urgente',
}

const PRIORITY_CLASS: Record<DocumentPriority, string> = {
  baja:    styles.priorityBaja,
  media:   styles.priorityMedia,
  alta:    styles.priorityAlta,
  urgente: styles.priorityUrgente,
}

// ── Due date helper ────────────────────────────────────────────────────
function DueDateLabel({ date }: { date: string }) {
  const parsed = parseISO(date)
  const diff = differenceInDays(parsed, new Date())
  const formatted = format(parsed, 'dd MMM yyyy', { locale: es })

  let cls = styles.dueDateOk
  let prefix = ''

  if (diff < 0) {
    cls = styles.dueDateOverdue
    prefix = 'Vencido · '
  } else if (diff <= 3) {
    cls = styles.dueDateWarning
    prefix = 'Por vencer · '
  }

  return (
    <span className={`${styles.dueDate} ${cls}`}>
      <Calendar size={12} />
      {prefix}{formatted}
    </span>
  )
}

// ── Component ──────────────────────────────────────────────────────────
interface Props {
  document: Document
}

export default function DocumentCard({ document: doc }: Props) {
  const initials = doc.created_by.full_name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const createdAgo = formatDistanceToNow(parseISO(doc.created_at), {
    addSuffix: true,
    locale: es,
  })

  return (
    <Link to={`/tramites/${doc.id}`} className={styles.card}>
      {/* Top row: doc number + type + badges */}
      <div className={styles.topRow}>
        <div className={styles.docMeta}>
          <span className={styles.docNumber}>{doc.document_number}</span>
          <span className={styles.docTypeTag}>{doc.document_type.name}</span>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${PRIORITY_CLASS[doc.priority]}`}>
            {PRIORITY_LABEL[doc.priority]}
          </span>
          <span className={`${styles.badge} ${STATUS_CLASS[doc.status]}`}>
            {STATUS_LABEL[doc.status]}
          </span>
        </div>
      </div>

      {/* Subject */}
      <div className={styles.subject}>{doc.subject}</div>

      {/* Sender / Recipient / Area */}
      <div className={styles.infoRow}>
        <div className={styles.infoItem}>
          <User size={13} />
          <span>De: <strong>{doc.sender}</strong></span>
        </div>
        <div className={styles.infoItem}>
          <ArrowRight size={13} />
          <span>Para: <strong>{doc.recipient}</strong></span>
        </div>
        {doc.area && (
          <div className={styles.infoItem}>
            <Building2 size={13} />
            <span>{doc.area.name}</span>
          </div>
        )}
      </div>

      {/* Footer: author + due date + attachments */}
      <div className={styles.footerRow}>
        <div className={styles.createdBy}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.createdByName}>
            {doc.created_by.full_name} · {createdAgo}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {doc.attachments_urls.length > 0 && (
            <span className={styles.attachmentCount}>
              <Paperclip size={12} />
              {doc.attachments_urls.length}
            </span>
          )}
          {doc.due_date && <DueDateLabel date={doc.due_date} />}
        </div>
      </div>
    </Link>
  )
}
