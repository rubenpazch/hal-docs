import {
  FileText,
  ArrowRight,
  CheckCircle,
  XCircle,
  RotateCcw,
  Forward,
  Archive,
  Flag,
  AlertTriangle,
  Info,
  Users,
  ShieldCheck,
} from 'lucide-react'
import styles from './FlujoDOcumentarioPage.module.css'

// ── Status definitions ─────────────────────────────────────────────────
const STATUSES = [
  {
    key: 'registrado',
    label: 'Registrado',
    color: 'blue',
    icon: <FileText size={16} />,
    description: 'Documento ingresado al sistema con número correlativo automático (ej. OFI-2026-00042). Es el punto de partida de todo trámite interno.',
  },
  {
    key: 'en_proceso',
    label: 'En Proceso',
    color: 'amber',
    icon: <ArrowRight size={16} />,
    description: 'El área responsable ha tomado el documento y está siendo atendido. Pueden registrarse avances y notas de progreso.',
  },
  {
    key: 'derivado',
    label: 'Derivado',
    color: 'purple',
    icon: <Forward size={16} />,
    description: 'El documento fue redirigido a otra área. El área destino queda registrada en el flujo y el documento aparece en su bandeja.',
  },
  {
    key: 'respondido',
    label: 'Respondido',
    color: 'teal',
    icon: <CheckCircle size={16} />,
    description: 'El área receptora ha emitido respuesta al documento. Puede proceder a su archivado o cierre final.',
  },
  {
    key: 'devuelto',
    label: 'Devuelto',
    color: 'orange',
    icon: <RotateCcw size={16} />,
    description: 'El receptor devolvió el documento al área de origen, generalmente por falta de firma digital válida u omisiones formales.',
  },
  {
    key: 'archivado',
    label: 'Archivado',
    color: 'gray',
    icon: <Archive size={16} />,
    description: 'Expediente cerrado y archivado. Estado terminal: no admite nuevas transiciones.',
  },
  {
    key: 'finalizado',
    label: 'Finalizado',
    color: 'green',
    icon: <Flag size={16} />,
    description: 'Trámite resuelto y cerrado formalmente. Estado terminal: no admite nuevas transiciones.',
  },
  {
    key: 'anulado',
    label: 'Anulado',
    color: 'red',
    icon: <XCircle size={16} />,
    description: 'Documento cancelado por un administrador o gestor. Solo disponible desde estados activos. Estado terminal.',
  },
]

// ── Transition table (from TransitionRules) ────────────────────────────
const TRANSITIONS = [
  { from: 'registrado',  to: 'en_proceso',  action: 'avance',     note: 'El área acepta el documento y comienza a procesarlo.' },
  { from: 'registrado',  to: 'derivado',    action: 'derivado',   note: 'Se redirige directamente a otra área sin procesarlo localmente. Requiere área destino.' },
  { from: 'registrado',  to: 'anulado',     action: 'anulado',    note: 'Solo admin/gestor.' },
  { from: 'en_proceso',  to: 'derivado',    action: 'derivado',   note: 'Durante el proceso se decide derivar a otra área. Requiere área destino.' },
  { from: 'en_proceso',  to: 'respondido',  action: 'avance',     note: 'El área emite respuesta al documento.' },
  { from: 'en_proceso',  to: 'devuelto',    action: 'devuelto',   note: 'Se detecta un problema formal y se devuelve al origen.' },
  { from: 'en_proceso',  to: 'finalizado',  action: 'finalizado', note: 'El trámite se cierra directamente desde procesamiento.' },
  { from: 'en_proceso',  to: 'anulado',     action: 'anulado',    note: 'Solo admin/gestor.' },
  { from: 'derivado',    to: 'en_proceso',  action: 'avance',     note: 'El área destino acepta y comienza a procesar.' },
  { from: 'derivado',    to: 'devuelto',    action: 'devuelto',   note: 'El área destino rechaza y devuelve.' },
  { from: 'derivado',    to: 'finalizado',  action: 'finalizado', note: 'El área destino cierra el trámite directamente.' },
  { from: 'derivado',    to: 'anulado',     action: 'anulado',    note: 'Solo admin/gestor.' },
  { from: 'respondido',  to: 'finalizado',  action: 'finalizado', note: 'Cierre formal tras respuesta.' },
  { from: 'respondido',  to: 'archivado',   action: 'avance',     note: 'El expediente se archiva.' },
  { from: 'respondido',  to: 'anulado',     action: 'anulado',    note: 'Solo admin/gestor.' },
  { from: 'devuelto',    to: 'en_proceso',  action: 'avance',     note: 'Se subsanaron los problemas y se retoma el proceso.' },
  { from: 'devuelto',    to: 'anulado',     action: 'anulado',    note: 'Solo admin/gestor.' },
]

// ── Flow actions ────────────────────────────────────────────────────────
const FLOW_ACTIONS = [
  {
    key: 'registrado',
    label: 'registrado',
    color: 'blue',
    description: 'Acción inicial al crear el documento. Queda registrado con número correlativo, timestamp oficial y datos del registrador.',
  },
  {
    key: 'avance',
    label: 'avance',
    color: 'amber',
    description: 'Registra progreso: cambios de estado hacia procesamiento, respuesta o archivado. Puede incluir notas de avance.',
  },
  {
    key: 'derivado',
    label: 'derivado',
    color: 'purple',
    description: 'Documenta el envío del trámite a otra área. Almacena el área de origen, el área de destino y la fecha del movimiento.',
  },
  {
    key: 'devuelto',
    label: 'devuelto',
    color: 'orange',
    description: 'El receptor rechaza formalmente el documento, normalmente por incumplimiento de requisitos de firma digital (INDECOPI).',
  },
  {
    key: 'finalizado',
    label: 'finalizado',
    color: 'green',
    description: 'Cierre definitivo del trámite. El flujo queda sellado y no puede reabrirse.',
  },
  {
    key: 'anulado',
    label: 'anulado',
    color: 'red',
    description: 'Cancelación por parte de un administrador o gestor. Requiere permiso de rol y se aplica solo desde estados activos.',
  },
]

// ── Roles ──────────────────────────────────────────────────────────────
const ROLES = [
  {
    role: 'admin',
    label: 'Administrador',
    color: 'red',
    icon: <ShieldCheck size={18} />,
    actions: ['Crear documentos', 'Cambiar cualquier estado', 'Derivar a cualquier área', 'Anular documentos', 'Editar cualquier documento'],
  },
  {
    role: 'manager',
    label: 'Gestor',
    color: 'purple',
    icon: <Users size={18} />,
    actions: ['Crear documentos', 'Cambiar cualquier estado', 'Derivar a cualquier área', 'Anular documentos', 'Editar documentos propios'],
  },
  {
    role: 'staff',
    label: 'Personal',
    color: 'blue',
    icon: <FileText size={18} />,
    actions: ['Crear documentos', 'Ver documentos propios', 'Editar documentos propios', 'No puede cambiar de estado'],
  },
]

export default function FlujoDOcumentarioPage() {
  return (
    <div className={styles.page}>

      {/* ── Page header ───────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.pageTitle}>Flujo Documentario Interno</h1>
          <p className={styles.pageSubtitle}>
            Ciclo de vida y transiciones de estado para documentos internos (Ley N° 25323 · STD IGP Manual)
          </p>
        </div>
      </div>

      {/* ── Info banner ───────────────────────────────────────── */}
      <div className={styles.infoBanner}>
        <Info size={16} className={styles.infoBannerIcon} />
        <p>
          Cada cambio de estado genera automáticamente un registro en el <strong>historial de flujo</strong> del
          documento, con el usuario responsable, las áreas involucradas, la fecha y las observaciones.
          Ningún cambio puede revertirse manualmente — el historial es inmutable.
        </p>
      </div>

      {/* ── Status grid ───────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Estados del documento</h2>
        <div className={styles.statusGrid}>
          {STATUSES.map((s) => (
            <div key={s.key} className={styles.statusCard}>
              <span className={styles.statusBadge} data-color={s.color}>
                {s.icon}
                {s.label}
              </span>
              <p className={styles.statusDesc}>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── State machine diagram ─────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Diagrama de transiciones</h2>
        <p className={styles.sectionSubtitle}>
          Los estados <strong>archivado</strong>, <strong>finalizado</strong> y <strong>anulado</strong> son
          terminales: no admiten transiciones de salida.
        </p>

        <div className={styles.diagram}>
          {/* Main path */}
          <div className={styles.mainPath}>
            {['registrado', 'en_proceso', 'derivado', 'respondido'].map((s, i, arr) => {
              const status = STATUSES.find(st => st.key === s)!
              return (
                <div key={s} className={styles.mainPathNode}>
                  <div className={styles.mainBubble} data-color={status.color}>
                    {status.icon}
                    <span>{status.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={styles.mainArrow}>
                      <ArrowRight size={18} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Terminal states row */}
          <div className={styles.terminalRow}>
            <div className={styles.terminalLabel}>
              <AlertTriangle size={13} />
              Estados terminales
            </div>
            <div className={styles.terminalNodes}>
              {['archivado', 'finalizado', 'anulado', 'devuelto'].map((s) => {
                const status = STATUSES.find(st => st.key === s)!
                return (
                  <span key={s} className={styles.terminalBadge} data-color={status.color}>
                    {status.icon}
                    {status.label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Transition table ──────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tabla de transiciones permitidas</h2>
        <p className={styles.sectionSubtitle}>
          Solo las combinaciones listadas aquí son válidas. Cualquier otra transición es
          rechazada por el sistema con un error <code>422</code>.
        </p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Desde</th>
                <th>Hacia</th>
                <th>Acción registrada</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {TRANSITIONS.map((t, i) => {
                const fromS = STATUSES.find(s => s.key === t.from)!
                const toS   = STATUSES.find(s => s.key === t.to)!
                const act   = FLOW_ACTIONS.find(a => a.key === t.action)!
                return (
                  <tr key={i}>
                    <td>
                      <span className={styles.tableBadge} data-color={fromS.color}>
                        {fromS.icon}{fromS.label}
                      </span>
                    </td>
                    <td>
                      <span className={styles.tableBadge} data-color={toS.color}>
                        {toS.icon}{toS.label}
                      </span>
                    </td>
                    <td>
                      <code className={styles.actionCode} data-color={act.color}>
                        {act.label}
                      </code>
                    </td>
                    <td className={styles.tableNote}>{t.note}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Flow actions ──────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Acciones de flujo (DocumentFlow)</h2>
        <p className={styles.sectionSubtitle}>
          Cada transición genera un registro de flujo con una de las siguientes acciones.
          El historial es ordenado cronológicamente y muestra el usuario, áreas y observaciones.
        </p>
        <div className={styles.actionsGrid}>
          {FLOW_ACTIONS.map((a) => (
            <div key={a.key} className={styles.actionCard}>
              <code className={styles.actionBadge} data-color={a.color}>{a.label}</code>
              <p className={styles.actionDesc}>{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles ─────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Permisos por rol</h2>
        <p className={styles.sectionSubtitle}>
          Las transiciones de estado (excepto la creación) requieren rol <strong>admin</strong> o <strong>gestor</strong>.
        </p>
        <div className={styles.rolesGrid}>
          {ROLES.map((r) => (
            <div key={r.role} className={styles.roleCard}>
              <div className={styles.roleHeader}>
                <span className={styles.roleBadge} data-color={r.color}>
                  {r.icon}
                  {r.label}
                </span>
              </div>
              <ul className={styles.roleActions}>
                {r.actions.map((action, i) => (
                  <li key={i} className={styles.roleAction}>
                    <CheckCircle size={13} className={styles.roleCheck} />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
