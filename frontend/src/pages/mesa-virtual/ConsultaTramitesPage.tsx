import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ChevronLeft, Search, Clock, CheckCircle, AlertCircle,
  FileText, RefreshCw, X, List, MessageSquareText,
  MapPin, CalendarDays, Building2, ArrowRight,
} from 'lucide-react'
import { mesaVirtualService, type TrackingResult, type TimelineEvent } from '@/services/mesaVirtualService'
import styles from './ConsultaTramitesPage.module.css'

const STATUS_LABEL: Record<string, string> = {
  registrado:  'Registrado',
  en_revision: 'En Revisión',
  observado:   'Observado',
  derivado:    'Derivado',
  finalizado:  'Finalizado',
}

const STATUS_COLOR: Record<string, string> = {
  registrado:  'blue',
  en_revision: 'orange',
  observado:   'red',
  derivado:    'purple',
  finalizado:  'green',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

function formatDateFull(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

// ── Timeline Drawer ────────────────────────────────────────────────────
function TimelineDrawer({
  submission,
  onClose,
}: {
  submission: TrackingResult
  onClose: () => void
}) {
  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderLeft}>
            <List size={18} />
            <div>
              <p className={styles.drawerLabel}>Seguimiento del trámite</p>
              <code className={styles.drawerTracking}>{submission.tracking_number}</code>
            </div>
          </div>
          <button className={styles.drawerClose} onClick={onClose}><X size={20} /></button>
        </div>

        {/* Summary */}
        <div className={styles.drawerSummary}>
          <div className={styles.summaryRow}>
            <FileText size={14} />
            <span>{submission.document_type.name}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Asunto:</span>
            <span>{submission.subject}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Estado actual:</span>
            <span
              className={styles.statusBadge}
              data-color={STATUS_COLOR[submission.status] ?? 'blue'}
            >
              {STATUS_LABEL[submission.status] ?? submission.status}
            </span>
          </div>
          {submission.to_area && (
            <div className={styles.summaryRow}>
              <Building2 size={14} />
              <span>{submission.to_area.name}</span>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className={styles.drawerBody}>
          <h3 className={styles.timelineTitle}>Historial de eventos</h3>
          <ol className={styles.timeline}>
            {submission.timeline.map((event: TimelineEvent, idx: number) => (
              <li
                key={idx}
                className={styles.timelineItem}
                data-last={idx === submission.timeline.length - 1}
              >
                <div className={styles.timelineDot} data-status={event.status} />
                <div className={styles.timelineContent}>
                  <div className={styles.timelineMeta}>
                    <CalendarDays size={12} />
                    <time className={styles.timelineDate}>{formatDateFull(event.date)}</time>
                  </div>
                  <p className={styles.timelineEvent}>{event.event}</p>
                  {event.from_area && (
                    <div className={styles.timelineArea} data-variant="from">
                      <MapPin size={12} />
                      <span>Desde: {event.from_area}</span>
                    </div>
                  )}
                  {event.area && (
                    <div className={styles.timelineArea}>
                      <MapPin size={12} />
                      <span>Hacia: {event.area}</span>
                    </div>
                  )}
                  {event.notes && (
                    <div className={styles.timelineNotes}>
                      <ArrowRight size={11} />
                      <span>{event.notes}</span>
                    </div>
                  )}
                  <span
                    className={styles.timelineStatusBadge}
                    data-color={STATUS_COLOR[event.status] ?? 'blue'}
                  >
                    {STATUS_LABEL[event.status] ?? event.status}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  )
}

// ── Motive Drawer ──────────────────────────────────────────────────────
function MotiveDrawer({
  notes,
  tracking,
  updatedAt,
  onClose,
}: {
  notes: string
  tracking: string
  updatedAt?: string
  onClose: () => void
}) {
  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} data-size="sm" onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderLeft}>
            <MessageSquareText size={18} />
            <div>
              <p className={styles.drawerLabel}>Observación registrada</p>
              <code className={styles.drawerTracking}>{tracking}</code>
            </div>
          </div>
          <button className={styles.drawerClose} onClick={onClose}><X size={20} /></button>
        </div>
        <div className={styles.drawerBody}>
          {updatedAt && (
            <p className={styles.motiveDate}>
              <CalendarDays size={13} /> {formatDateFull(updatedAt)}
            </p>
          )}
          <div className={styles.motiveBox}>{notes}</div>
          <p className={styles.motiveHint}>
            Si tienes dudas sobre esta observación, comunícate con la institución indicando tu número de trámite.
          </p>
        </div>
      </aside>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────
export default function ConsultaTramitesPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'tracking' | 'document'>('tracking')
  const [value, setValue] = useState('')
  const [results, setResults] = useState<TrackingResult[] | null>(null)
  const [error, setError] = useState('')

  const [timelineSubmission, setTimelineSubmission] = useState<TrackingResult | null>(null)
  const [motiveData, setMotiveData] = useState<{ notes: string; tracking: string; updatedAt?: string } | null>(null)

  const trackMutation = useMutation({
    mutationFn: mesaVirtualService.track,
    onSuccess: (data) => {
      setResults(data)
      setError('')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'No se encontraron trámites con los datos proporcionados'
      setResults([])
      setError(msg)
    },
  })

  function handleSearch() {
    if (!value.trim()) { setError('Ingrese un valor para buscar'); return }
    setError('')
    const params = mode === 'tracking'
      ? { tracking_number: value.trim() }
      : { document: value.trim() }
    trackMutation.mutate(params)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button className={styles.backBtn} onClick={() => navigate('/mesa-virtual')}>
            <ChevronLeft size={16} /> Mesa Virtual
          </button>
          <span className={styles.headerTitle}>Consultar Mis Trámites</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Search size={18} /> Filtro de Búsqueda
          </h2>

          <div className={styles.modeToggle}>
            <button
              className={styles.modeBtn}
              data-active={mode === 'tracking'}
              onClick={() => { setMode('tracking'); setValue(''); setResults(null); setError('') }}
            >
              Por número de trámite
            </button>
            <button
              className={styles.modeBtn}
              data-active={mode === 'document'}
              onClick={() => { setMode('document'); setValue(''); setResults(null); setError('') }}
            >
              Por DNI / RUC
            </button>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.searchField}>
              <label>
                {mode === 'tracking' ? 'Número de trámite (Ej: VT-2026-0000001)' : 'DNI o RUC del solicitante'}
              </label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'tracking' ? 'VT-2026-XXXXXXX' : '45603792'}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={error ? styles.inputError : ''}
              />
              {error && <span className={styles.errorMsg}><AlertCircle size={14} /> {error}</span>}
            </div>
            <div className={styles.searchActions}>
              <button
                className={styles.btnSearch}
                onClick={handleSearch}
                disabled={trackMutation.isPending}
              >
                {trackMutation.isPending
                  ? <><RefreshCw size={15} className={styles.spin} /> Buscando…</>
                  : <><Search size={15} /> Consultar</>
                }
              </button>
              <button
                className={styles.btnClear}
                onClick={() => { setValue(''); setResults(null); setError('') }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {results !== null && (
          <div className={styles.resultsSection}>
            <h3 className={styles.resultsTitle}>Resultado de la búsqueda:</h3>

            {results.length === 0 ? (
              <div className={styles.emptyState}>
                <FileText size={40} />
                <p>No se encontraron trámites con los datos proporcionados.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nro de Trámite</th>
                      <th>Tipo de Documento</th>
                      <th>Asunto</th>
                      <th>Estado</th>
                      <th>Fecha de Recepción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.tracking_number}>
                        <td>
                          <code className={styles.trackingCode}>{r.tracking_number}</code>
                        </td>
                        <td>{r.document_type.name}</td>
                        <td className={styles.subjectCell}>{r.subject}</td>
                        <td>
                          <span
                            className={styles.statusBadge}
                            data-color={STATUS_COLOR[r.status] ?? 'blue'}
                          >
                            {STATUS_COLOR[r.status] === 'green'
                              ? <CheckCircle size={12} />
                              : STATUS_COLOR[r.status] === 'orange'
                                ? <Clock size={12} />
                                : null}
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className={styles.dateCell}>{formatDate(r.received_at)}</td>
                        <td>
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.btnTimeline}
                              onClick={() => setTimelineSubmission(r)}
                            >
                              <List size={13} /> Ver seguimiento
                            </button>
                            {r.review_notes && (
                              <button
                                className={styles.notesBtn}
                                onClick={() => setMotiveData({
                                  notes: r.review_notes!,
                                  tracking: r.tracking_number,
                                  updatedAt: r.created_at,
                                })}
                              >
                                <MessageSquareText size={13} /> Ver motivo
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {timelineSubmission && (
        <TimelineDrawer
          submission={timelineSubmission}
          onClose={() => setTimelineSubmission(null)}
        />
      )}
      {motiveData && (
        <MotiveDrawer
          notes={motiveData.notes}
          tracking={motiveData.tracking}
          updatedAt={motiveData.updatedAt}
          onClose={() => setMotiveData(null)}
        />
      )}
    </div>
  )
}
