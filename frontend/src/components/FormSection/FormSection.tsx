import type { ReactNode } from 'react'
import styles from './FormSection.module.css'

interface Props {
  title?: string
  children: ReactNode
  /** Number of responsive grid columns (default 2) */
  columns?: 1 | 2 | 3
}

export default function FormSection({ title, children, columns = 2 }: Props) {
  return (
    <section className={styles.section}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.grid} data-cols={columns}>
        {children}
      </div>
    </section>
  )
}
