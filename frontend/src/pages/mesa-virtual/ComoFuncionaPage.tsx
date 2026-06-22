import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  ArrowLeft,
  CheckCircle,
  Eye,
  AlertCircle,
  ArrowRightLeft,
  Flag,
  Clock,
  Mail,
  Shield,
  Hash,
  ChevronRight,
} from 'lucide-react'
import styles from './ComoFuncionaPage.module.css'

// ── Status definitions ─────────────────────────────────────────────────
const EXTERNAL_STATUSES = [
  {
    key: 'registrado',
    label: 'Registrado',
    icon: <FileText size={22} />,
    color: 'blue',
    actor: 'Ciudadano',
    description:
      'El ciudadano envía el documento a través de la Mesa de Partes Virtual. El sistema asigna automáticamente un número de trámite único (ej. VT-2026-0001234) y registra la fecha y hora oficial del servidor.',
    notes: [
      'Recibirá el número de trámite en pantalla inmediatamente.',
      'El cómputo de plazos inicia el siguiente día hábil (08:30 – 17:30).',
    ],
  },
  {
    key: 'en_revision',
    label: 'En Revisión',
    icon: <Eye size={22} />,
    color: 'amber',
    actor: 'Personal de mesa de partes',
    description:
      'El personal de mesa revisa la documentación presentada: verifica que el tipo de documento, los datos del solicitante y los adjuntos sean correctos y completos.',
    notes: [
      'El trámite aparece en la bandeja del área receptora.',
      'En esta etapa no se requiere ninguna acción del ciudadano.',
    ],
  },
  {
    key: 'observado',
    label: 'Observado',
    icon: <AlertCircle size={22} />,
    color: 'orange',
    actor: 'Personal de mesa de partes',
    description:
      'Si el documento presenta inconvenientes (datos incorrectos, adjuntos ilegibles, falta de firma, etc.) el personal registra una observación. Se recomienda volver a presentar el trámite corrigiendo los puntos señalados.',
    notes: [
      'Consulte el detalle de la observación con su número de trámite.',
      'Puede presentar un nuevo trámite subsanando los puntos observados.',
    ],
  },
  {
    key: 'derivado',
    label: 'Derivado',
    icon: <ArrowRightLeft size={22} />,
    color: 'purple',
    actor: 'Personal de mesa de partes / Área receptora',
    description:
      'Una vez validado, el trámite es derivado al área competente (ej. Gerencia, Asesoría Legal, Tesorería) que debe atenderlo. El área destinataria recibe una notificación en su bandeja interna.',
    notes: [
      'El área de destino puede variar según el tipo de documento.',
      'La derivación queda registrada en el historial del trámite.',
    ],
  },
  {
    key: 'finalizado',
    label: 'Finalizado',
    icon: <Flag size={22} />,
    color: 'green',
    actor: 'Área competente',
    description:
      'El área responsable atiende y resuelve el trámite. El proceso concluye y el expediente queda registrado en el sistema con la resolución o respuesta emitida.',
    notes: [
      'Puede consultar el estado final con su número de trámite.',
      'Si corresponde, la respuesta se comunica al correo registrado.',
    ],
  },
]

// ── Tracking tips ─────────────────────────────────────────────────────
const TIPS = [
  {
    icon: <Hash size={18} />,
    title: 'Guarde su número de trámite',
    body: 'Es el único medio para consultar el estado. Se asigna al registrar y no puede recuperarse si se pierde.',
  },
  {
    icon: <Mail size={18} />,
    title: 'Ingrese un correo válido',
    body: 'Algunas notificaciones del proceso se envían al correo electrónico indicado en el formulario.',
  },
  {
    icon: <Clock size={18} />,
    title: 'Recuerde los plazos hábiles',
    body: 'Los documentos recibidos fuera del horario de atención (08:30 – 17:30) se consideran presentados el siguiente día hábil.',
  },
  {
    icon: <Shield size={18} />,
    title: 'Sus datos están protegidos',
    body: 'El sistema cumple con la normativa peruana de protección de datos personales (Ley 29733).',
  },
]

export default function ComoFuncionaPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <FileText size={26} />
            </div>
            <div>
              <span className={styles.brandName}>Mesa de Partes Virtual</span>
              <span className={styles.brandSub}>Sistema de Trámite Documentario</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.backLink} onClick={() => navigate('/mesa-virtual')}>
              <ArrowLeft size={15} />
              Volver
            </button>
            <a href="/login" className={styles.staffLink}>Acceso del Personal</a>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>¿Cómo funciona la Mesa de Partes Virtual?</h1>
          <p className={styles.heroDesc}>
            Conozca el recorrido de su trámite desde que lo presenta hasta su resolución final.
            Cada etapa queda registrada y puede consultarla en cualquier momento.
          </p>
          <div className={styles.heroBadges}>
            <span className={styles.heroBadge}><CheckCircle size={13} /> 5 etapas</span>
            <span className={styles.heroBadge}><Clock size={13} /> Atención 24/7</span>
            <span className={styles.heroBadge}><Shield size={13} /> Trazabilidad completa</span>
          </div>
        </div>
      </section>

      <main className={styles.main}>

        {/* ── Flow strip ──────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ciclo de vida del trámite</h2>
          <p className={styles.sectionDesc}>
            Todo trámite presentado en la Mesa Virtual atraviesa las siguientes etapas en orden.
            El estado <strong>Observado</strong> puede aparecer en lugar de <strong>En Revisión</strong>
            cuando el documento requiere correcciones.
          </p>

          <div className={styles.flowStrip}>
            {EXTERNAL_STATUSES.map((s, i) => (
              <div key={s.key} className={styles.flowNode}>
                <div className={styles.flowBubble} data-color={s.color}>
                  {s.icon}
                </div>
                <span className={styles.flowLabel}>{s.label}</span>
                {i < EXTERNAL_STATUSES.length - 1 && (
                  <div className={styles.flowArrow}>
                    <ChevronRight size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Status cards ─────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Detalle de cada estado</h2>
          <div className={styles.statusList}>
            {EXTERNAL_STATUSES.map((s, i) => (
              <div key={s.key} className={styles.statusCard}>
                <div className={styles.statusStep}>{i + 1}</div>
                <div className={styles.statusBody}>
                  <div className={styles.statusHeader}>
                    <span className={styles.statusBadge} data-color={s.color}>
                      {s.icon}
                      {s.label}
                    </span>
                    <span className={styles.statusActor}>
                      Responsable: <strong>{s.actor}</strong>
                    </span>
                  </div>
                  <p className={styles.statusDesc}>{s.description}</p>
                  {s.notes.length > 0 && (
                    <ul className={styles.statusNotes}>
                      {s.notes.map((n, j) => (
                        <li key={j}>{n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tips ─────────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recomendaciones para el ciudadano</h2>
          <div className={styles.tipsGrid}>
            {TIPS.map((tip, i) => (
              <div key={i} className={styles.tip}>
                <div className={styles.tipIcon}>{tip.icon}</div>
                <div>
                  <strong className={styles.tipTitle}>{tip.title}</strong>
                  <p className={styles.tipBody}>{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <section className={styles.cta}>
          <div className={styles.ctaCard}>
            <FileText size={32} className={styles.ctaIcon} />
            <div>
              <h3 className={styles.ctaTitle}>¿Listo para presentar su trámite?</h3>
              <p className={styles.ctaDesc}>
                Prepare su documento en formato PDF y sus datos de identidad. El proceso toma menos de 5 minutos.
              </p>
            </div>
            <div className={styles.ctaActions}>
              <button className={styles.ctaPrimary} onClick={() => navigate('/mesa-virtual/nuevo')}>
                Iniciar trámite
                <ChevronRight size={16} />
              </button>
              <button className={styles.ctaSecondary} onClick={() => navigate('/mesa-virtual/consulta')}>
                <Search size={15} />
                Consultar estado
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} — Sistema de Trámite Documentario. Todos los derechos reservados.</p>
        <p className={styles.footerNote}>
          Conforme a: Ley N° 25323 · Resolución 0034-2014-INDECOPI/GEG · DS 098-2025-PCM
        </p>
      </footer>
    </div>
  )
}
