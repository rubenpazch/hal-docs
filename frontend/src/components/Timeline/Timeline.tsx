import { CalendarDays, MapPin, ArrowRight } from 'lucide-react'
import styles from './Timeline.module.css'

const STATUS_COLOR: Record<string, string> = {
  registrado:  'blue',
  en_revision: 'orange',
  observado:   'red',
  derivado:    'purple',
  finalizado:  'green',
  en_proceso:  'yellow',
  respondido:  'green',
  archivado:   'gray',
  anulado:     'red',
  devuelto:    'orange',
}

const STATUS_LABEL: Record<string, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
  en_proceso:  'En Proceso',
  respondido:  'Respondido',
  archivado:   'Archivado',
  anulado:     'Anulado',
  devuelto:    'Devuelto',
}

function formatDateFull(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

export interface TimelineEvent {
  date: string
  event: string
  status: string
  from_area?: string | null
  area?: string | null
  notes?: string | null
}

interface Props {
  events: TimelineEvent[]
  emptyMessage?: string
}

export default function Timeline({ events, emptyMessage = 'Sin eventos registrados aún.' }: Props) {
  if (events.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <ol className={styles.timeline}>
      {events.map((event, idx) => (
        <li
          key={idx}
          className={styles.item}
          data-last={idx === events.length - 1}
        >
          <div
            className={styles.dot}
            data-color={STATUS_COLOR[event.status] ?? 'blue'}
          />
          <div className={styles.content}>
            <div className={styles.meta}>
              <CalendarDays size={12} />
              <time className={styles.date}>{formatDateFull(event.date)}</time>
            </div>
            <p className={styles.event}>{event.event}</p>
            {event.from_area && (
              <div className={styles.area} data-variant="from">
                <MapPin size={12} />
                <span>Desde: {event.from_area}</span>
              </div>
            )}
            {event.area && (
              <div className={styles.area}>
                <MapPin size={12} />
                <span>Hacia: {event.area}</span>
              </div>
            )}
            {event.notes && (
              <div className={styles.notes}>
                <ArrowRight size={11} />
                <span>{event.notes}</span>
              </div>
            )}
            <span
              className={styles.badge}
              data-color={STATUS_COLOR[event.status] ?? 'blue'}
            >
              {STATUS_LABEL[event.status] ?? event.status}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
