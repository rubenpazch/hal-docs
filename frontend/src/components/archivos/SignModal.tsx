import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, PenLine, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import type { Archivo } from '@/types/archivo'
import styles from './SignModal.module.css'

interface Props {
  archivo: Archivo
  onClose: () => void
}

interface SignaturePosition {
  page: number
  x: number  // percentage 0-100 of page width
  y: number  // percentage 0-100 of page height
}

export default function SignModal({ archivo, onClose }: Props) {
  const qc = useQueryClient()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [position, setPosition] = useState<SignaturePosition>({ page: 1, x: 70, y: 85 })
  const paperRef = useRef<HTMLDivElement>(null)

  const signMutation = useMutation({
    mutationFn: () =>
      api.post(`/archivos/${archivo.id}/sign`, {
        password,
        signature_page: position.page,
        signature_x: position.x.toFixed(2),
        signature_y: position.y.toFixed(2),
      }),
    onSuccess: () => {
      toast.success('Documento firmado correctamente')
      qc.invalidateQueries({ queryKey: ['archivos'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'No se pudo firmar el documento')
    },
  })

  const handlePaperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = paperRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPosition((p) => ({ ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('Ingresa la contraseña de tu certificado digital')
      return
    }
    signMutation.mutate()
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <PenLine size={16} />
            <span>Firmar documento</span>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          {/* Document info */}
          <div className={styles.docInfo}>
            <span className={styles.docCode}>{archivo.document_type.code}</span>
            <span className={styles.docName}>{archivo.nombre}</span>
          </div>

          {/* Signature position picker */}
          <div className={styles.positionSection}>
            <p className={styles.sectionLabel}>Posición de la firma en el documento</p>
            <p className={styles.sectionHint}>
              Haz clic sobre la hoja para ubicar la firma. Puedes ajustar la página abajo.
            </p>

            <div className={styles.paperWrap}>
              {/* Page selector */}
              <div className={styles.pageNav}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPosition((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={position.page <= 1}
                >‹</button>
                <span className={styles.pageLabel}>Página {position.page}</span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  onClick={() => setPosition((p) => ({ ...p, page: p.page + 1 }))}
                >›</button>
              </div>

              {/* Paper (A4 ratio 1:1.414) */}
              <div
                ref={paperRef}
                className={styles.paper}
                onClick={handlePaperClick}
                title="Haz clic para posicionar la firma"
              >
                {/* Watermark lines to suggest a real page */}
                <div className={styles.paperLines}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className={styles.paperLine} />
                  ))}
                </div>

                {/* Signature stamp */}
                <div
                  className={styles.signatureStamp}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  <div className={styles.stampInner}>
                    <PenLine size={10} />
                    <span>FIRMA</span>
                  </div>
                </div>
              </div>

              {/* Coordinate readout */}
              <div className={styles.coords}>
                X: {position.x.toFixed(0)}% · Y: {position.y.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Password */}
          <div className={styles.passwordSection}>
            <label className={styles.sectionLabel}>
              Contraseña del certificado digital <span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.passwordInput}
                placeholder="Contraseña del certificado .p12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={signMutation.isPending}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSign} disabled={signMutation.isPending || !password}>
              {signMutation.isPending ? (
                <><Loader2 size={14} className={styles.spin} /> Firmando...</>
              ) : (
                <><PenLine size={14} /> Firmar documento</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
