import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '@/types/document'
import styles from './Pagination.module.css'

interface Props {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  perPageOptions?: number[]
}

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}

export default function Pagination({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50],
}: Props) {
  const { current_page, total_pages, total, from, to } = meta

  if (total_pages <= 1 && !onPerPageChange) return null

  const pages = buildPages(current_page, total_pages)

  return (
    <div className={styles.pagination}>
      {/* Info text */}
      <span className={styles.info}>
        Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong> resultado{total !== 1 ? 's' : ''}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Per-page selector */}
        {onPerPageChange && (
          <select
            className={styles.perPageSelect}
            value={meta.per_page}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>
                {n} por página
              </option>
            ))}
          </select>
        )}

        {/* Page buttons */}
        {total_pages > 1 && (
          <div className={styles.controls}>
            {/* Prev */}
            <button
              className={styles.pageBtn}
              onClick={() => onPageChange(current_page - 1)}
              disabled={current_page === 1}
              aria-label="Página anterior"
              type="button"
            >
              <ChevronLeft size={15} />
            </button>

            {pages.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`${styles.pageBtn} ${p === current_page ? styles.pageBtnActive : ''}`}
                  onClick={() => onPageChange(p as number)}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              className={styles.pageBtn}
              onClick={() => onPageChange(current_page + 1)}
              disabled={current_page === total_pages}
              aria-label="Página siguiente"
              type="button"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
