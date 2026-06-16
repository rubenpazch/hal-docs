import styles from './Skeleton.module.css'

// ── TableSkeleton ─────────────────────────────────────────────────────────────
interface TableSkeletonProps {
  rows?: number
  cols?: number
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className={styles.skeletonRow} aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <div
                className={styles.line}
                style={{ width: c === 0 ? '60%' : c === cols - 1 ? '40%' : '80%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────
interface SkeletonCardProps {
  lines?: number
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  const widths = ['50%', '80%', '65%', '90%', '55%']
  return (
    <div className={styles.card} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.line} style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  )
}
