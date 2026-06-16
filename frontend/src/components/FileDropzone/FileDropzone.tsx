import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText } from 'lucide-react'
import styles from './FileDropzone.module.css'

interface Props {
  files: File[]
  onFiles: (files: File[]) => void
  onRemove: (name: string) => void
  accept?: Record<string, string[]>
  maxFiles?: number
  maxSizeMB?: number
  /** Descriptive text shown inside the drop zone */
  hint?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileDropzone({
  files,
  onFiles,
  onRemove,
  accept = { 'application/pdf': ['.pdf'] },
  maxFiles,
  maxSizeMB = 20,
  hint,
}: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const existing = new Set(files.map((f) => f.name))
      const fresh = accepted.filter((f) => !existing.has(f.name))
      onFiles([...files, ...fresh])
    },
    [files, onFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles,
  })

  return (
    <div className={styles.wrapper}>
      <div
        {...getRootProps()}
        className={`${styles.zone} ${isDragActive ? styles.active : ''}`}
        data-drag={isDragActive}
      >
        <input {...getInputProps()} data-testid="dropzone-input" />
        <Upload size={28} className={styles.icon} />
        <p className={styles.primary}>
          {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
        </p>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>

      {files.length > 0 && (
        <ul className={styles.fileList} aria-label="Archivos seleccionados">
          {files.map((file) => (
            <li key={file.name} className={styles.fileItem}>
              <FileText size={16} className={styles.fileIcon} />
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatBytes(file.size)}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemove(file.name)}
                aria-label={`Eliminar ${file.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
