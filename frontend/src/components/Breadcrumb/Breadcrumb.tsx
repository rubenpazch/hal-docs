import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import styles from './Breadcrumb.module.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({ items }: Props) {
  return (
    <nav className={styles.breadcrumb} aria-label="breadcrumb">
      <ol className={styles.list}>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={idx} className={styles.item}>
              {!isLast && item.href ? (
                <Link to={item.href} className={styles.link}>{item.label}</Link>
              ) : (
                <span className={styles.current} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight size={13} className={styles.separator} aria-hidden="true" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
