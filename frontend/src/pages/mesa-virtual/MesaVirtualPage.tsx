import { useNavigate } from 'react-router-dom'
import { FileText, Search, ChevronRight, Clock, Shield, CheckCircle, HelpCircle } from 'lucide-react'
import styles from './MesaVirtualPage.module.css'

export default function MesaVirtualPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <FileText size={28} />
            </div>
            <div>
              <span className={styles.brandName}>Mesa de Partes Virtual</span>
              <span className={styles.brandSub}>Sistema de Trámite Documentario</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.howItWorksLink} onClick={() => navigate('/mesa-virtual/como-funciona')}>
              <HelpCircle size={14} />
              ¿Cómo funciona?
            </button>
            <a href="/login" className={styles.staffLink}>
              Acceso del Personal
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Mesa de Partes Virtual</h1>
          <p className={styles.heroDesc}>
            Presente sus documentos de forma digital sin necesidad de acercarse a nuestras oficinas.
            Disponible las 24 horas, los 7 días de la semana.
          </p>
          <p className={styles.heroNote}>
            <Clock size={14} />
            El cómputo de plazos rige a partir del siguiente día hábil (08:30 – 17:30).
          </p>
        </div>
      </section>

      {/* ── Main actions ──────────────────────────────────────────── */}
      <main className={styles.main}>
        <div className={styles.cards}>
          {/* Card: Registro */}
          <button
            className={styles.card}
            onClick={() => navigate('/mesa-virtual/nuevo')}
          >
            <div className={styles.cardIcon} data-variant="primary">
              <FileText size={40} />
            </div>
            <h2 className={styles.cardTitle}>Registro de Documento</h2>
            <p className={styles.cardDesc}>
              Presente solicitudes, oficios, cartas u otros documentos. Recibirá un número
              de trámite para realizar el seguimiento.
            </p>
            <span className={styles.cardLink}>
              Iniciar registro <ChevronRight size={16} />
            </span>
          </button>

          {/* Card: Consulta */}
          <button
            className={styles.card}
            onClick={() => navigate('/mesa-virtual/consulta')}
          >
            <div className={styles.cardIcon} data-variant="secondary">
              <Search size={40} />
            </div>
            <h2 className={styles.cardTitle}>Consultar Mis Trámites</h2>
            <p className={styles.cardDesc}>
              Consulte el estado de sus documentos presentados ingresando su número de
              trámite o número de documento de identidad.
            </p>
            <span className={styles.cardLink}>
              Consultar estado <ChevronRight size={16} />
            </span>
          </button>
        </div>

        {/* ── Features ──────────────────────────────────────────── */}
        <section className={styles.features}>
          <div className={styles.feature}>
            <CheckCircle size={20} className={styles.featureIcon} />
            <div>
              <strong>Sin cola, sin traslado</strong>
              <p>Presente su trámite desde cualquier dispositivo con conexión a internet.</p>
            </div>
          </div>
          <div className={styles.feature}>
            <Clock size={20} className={styles.featureIcon} />
            <div>
              <strong>Disponible 24/7</strong>
              <p>
                Recibe documentos en cualquier momento. Los plazos se computan desde el
                siguiente día hábil según DS 098-2025-PCM.
              </p>
            </div>
          </div>
          <div className={styles.feature}>
            <Shield size={20} className={styles.featureIcon} />
            <div>
              <strong>Seguro y trazable</strong>
              <p>Cada documento recibe un número único e inamovible. Puede consultar su estado en todo momento.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} — Sistema de Trámite Documentario. Todos los derechos reservados.</p>
        <p className={styles.footerNote}>
          Conforme a: Ley N° 25323 · Resolución 0034-2014-INDECOPI/GEG · DS 098-2025-PCM
        </p>
      </footer>
    </div>
  )
}
