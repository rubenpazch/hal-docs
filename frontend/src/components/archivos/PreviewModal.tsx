import { X, Download, FileText, ExternalLink } from 'lucide-react'
import type { Archivo } from '@/types/archivo'
import styles from './PreviewModal.module.css'

interface Props {
  archivo: Archivo
  onClose: () => void
}

const PREVIEWABLE = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PreviewModal({ archivo, onClose }: Props) {
  const file = archivo.file
  const canPreview = file && PREVIEWABLE.includes(file.content_type)
  const isImage = file && file.content_type.startsWith('image/')

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={16} />
            <span className={styles.headerName}>{archivo.nombre}</span>
            <span className={styles.headerType}>{archivo.document_type.code}</span>
          </div>
          <div className={styles.headerActions}>
            {file && (
              <>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnIcon}
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={15} />
                </a>
                <a
                  href={file.url}
                  download={file.filename}
                  className={styles.btnIcon}
                  title="Descargar"
                >
                  <Download size={15} />
                </a>
              </>
            )}
            <button className={`${styles.btnIcon} ${styles.btnClose}`} onClick={onClose} title="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {!file ? (
            <div className={styles.noFile}>
              <FileText size={40} strokeWidth={1.2} />
              <p>No hay archivo adjunto</p>
            </div>
          ) : canPreview ? (
            isImage ? (
              <div className={styles.imageWrap}>
                <img src={file.url} alt={archivo.nombre} className={styles.image} />
              </div>
            ) : (
              /* PDF via native browser renderer */
              <iframe
                src={file.url}
                title={archivo.nombre}
                className={styles.pdfFrame}
                sandbox="allow-scripts allow-same-origin"
              />
            )
          ) : (
            <div className={styles.noPreview}>
              <FileText size={40} strokeWidth={1.2} />
              <p>No se puede previsualizar este tipo de archivo</p>
              <p className={styles.noPreviewSub}>
                {file.filename} · {formatBytes(file.byte_size)}
              </p>
              <a href={file.url} download={file.filename} className={styles.btnDownload}>
                <Download size={14} /> Descargar archivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
