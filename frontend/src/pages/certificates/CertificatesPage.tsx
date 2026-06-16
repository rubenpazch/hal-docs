import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShieldCheck, ShieldAlert, Shield, Plus, Star, Trash2,
  Calendar, Hash, Building2, Info, CheckCircle2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '@/lib/api'
import ConfirmInline from '@/components/ConfirmInline/ConfirmInline'
import type { DigitalCertificate, CertificatesResponse } from '@/types/certificate'
import styles from './CertificatesPage.module.css'

// ── Helpers ────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return format(parseISO(iso), "dd 'de' MMMM yyyy", { locale: es })
}

function StatusBadge({ cert }: { cert: DigitalCertificate }) {
  if (cert.status === 'expired')  return <span className={`${styles.statusBadge} ${styles.statusExpired}`}><ShieldAlert size={12} /> Vencido</span>
  if (cert.status === 'expiring') return <span className={`${styles.statusBadge} ${styles.statusExpiring}`}><ShieldAlert size={12} /> Por vencer</span>
  return <span className={`${styles.statusBadge} ${styles.statusValid}`}><CheckCircle2 size={12} /> Vigente</span>
}

function CertIcon({ cert }: { cert: DigitalCertificate }) {
  const cls = cert.status === 'expired' ? styles.certIconExpired
            : cert.status === 'expiring' ? styles.certIconExpiring
            : ''
  const Icon = cert.status === 'expired' || cert.status === 'expiring' ? ShieldAlert : ShieldCheck
  return (
    <div className={`${styles.certIcon} ${cls}`}>
      <Icon size={20} />
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonLine} style={{ width: '50%' }} />
      <div className={styles.skeletonLine} style={{ width: '80%' }} />
      <div className={styles.skeletonLine} style={{ width: '65%' }} />
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['digital-certificates'],
    queryFn: async () => {
      const res = await api.get<CertificatesResponse>('/digital_certificates')
      return res.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/digital_certificates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-certificates'] })
      setConfirmingId(null)
      toast.success('Certificado eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el certificado'),
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/digital_certificates/${id}/set_default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-certificates'] })
      toast.success('Certificado establecido como predeterminado')
    },
    onError: () => toast.error('No se pudo actualizar el certificado'),
  })

  const certs = data?.certificates ?? []

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Mis Certificados Digitales</h1>
          <p>
            {isLoading ? 'Cargando…' : `${certs.length} certificado${certs.length !== 1 ? 's' : ''} registrado${certs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link to="/mis-certificados/nuevo" className={styles.btnNew}>
          <Plus size={16} /> Agregar Certificado
        </Link>
      </div>

      {/* Info */}
      <div className={styles.infoBanner}>
        <Info size={15} />
        <span>
          Sube tu certificado digital en formato <strong>.p12</strong> o <strong>.pfx</strong> (emitido por RENIEC u otra CA reconocida).
          El certificado predeterminado se usará automáticamente al firmar documentos.
          La contraseña <strong>no</strong> se almacena — se solicitará cada vez que firmes.
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : certs.length === 0 ? (
        <div className={styles.empty}>
          <Shield size={42} />
          <h3>Sin certificados registrados</h3>
          <p>Agrega tu certificado digital para poder firmar documentos desde la plataforma.</p>
          <Link to="/mis-certificados/nuevo" className={styles.btnNew}>
            <Plus size={15} /> Agregar primer certificado
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {certs.map((cert) => (
            <div
              key={cert.id}
              className={`${styles.card} ${cert.is_default ? styles.cardDefault : ''} ${cert.status === 'expired' ? styles.cardExpired : ''}`}
            >
              {cert.is_default && (
                <div className={styles.defaultBadge}>
                  <Star size={11} /> Predeterminado
                </div>
              )}

              <div className={styles.cardHeader}>
                <CertIcon cert={cert} />
                <div>
                  <p className={styles.cardTitle}>{cert.alias_name}</p>
                  <p className={styles.cardSubtitle}>{cert.issued_to ?? cert.subject_dn ?? '—'}</p>
                </div>
              </div>

              <StatusBadge cert={cert} />

              <div className={styles.meta}>
                {cert.issuer_dn && (
                  <div className={styles.metaRow}>
                    <Building2 size={13} />
                    <span><span className={styles.metaLabel}>Emitido por:</span>{extractCN(cert.issuer_dn)}</span>
                  </div>
                )}
                {cert.serial_number && (
                  <div className={styles.metaRow}>
                    <Hash size={13} />
                    <span><span className={styles.metaLabel}>Serie:</span>{cert.serial_number}</span>
                  </div>
                )}
                <div className={styles.metaRow}>
                  <Calendar size={13} />
                  <span>
                    <span className={styles.metaLabel}>Vigencia:</span>
                    {fmtDate(cert.valid_from)} — {fmtDate(cert.valid_until)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.cardFooter}>
                {confirmingId === cert.id ? (
                  <ConfirmInline
                    message="¿Eliminar este certificado?"
                    confirmLabel="Sí, eliminar"
                    loading={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(cert.id)}
                    onCancel={() => setConfirmingId(null)}
                  />
                ) : (
                  <>
                    <button
                      className={styles.btnSetDefault}
                      onClick={() => setDefaultMutation.mutate(cert.id)}
                      disabled={cert.is_default || setDefaultMutation.isPending}
                      type="button"
                    >
                      <Star size={13} />
                      {cert.is_default ? 'Predeterminado' : 'Usar como predeterminado'}
                    </button>

                    <button
                      className={styles.btnDelete}
                      onClick={() => setConfirmingId(cert.id)}
                      title="Eliminar"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function extractCN(dn: string): string {
  const m = dn.match(/CN=([^,/]+)/)
  return m ? m[1].trim() : dn
}
