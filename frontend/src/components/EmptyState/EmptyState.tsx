import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface Action {
  label: string
  onClick?: () => void
  href?: string
}

interface Props {
  icon: ReactNode
  title: string
  description?: string
  action?: Action
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className={styles.container} role="status">
      <div className={styles.icon} aria-hidden="true">{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        action.href ? (
          <a href={action.href} className={styles.action}>{action.label}</a>
        ) : (
          <button type="button" onClick={action.onClick} className={styles.action}>
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
