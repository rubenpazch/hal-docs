import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import EmptyState from './EmptyState'

const icon = <span data-testid="icon">📭</span>

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState icon={icon} title="Sin resultados" />)
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('renders the icon', () => {
    render(<EmptyState icon={icon} title="Sin resultados" />)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState icon={icon} title="T" description="No hay datos disponibles." />)
    expect(screen.getByText('No hay datos disponibles.')).toBeInTheDocument()
  })

  it('does not render description when omitted', () => {
    render(<EmptyState icon={icon} title="T" />)
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })

  it('renders a button action and calls onClick', async () => {
    const onClick = vi.fn()
    render(<EmptyState icon={icon} title="T" action={{ label: 'Crear', onClick }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders an anchor action when href is provided', () => {
    render(<EmptyState icon={icon} title="T" action={{ label: 'Ir', href: '/nuevo' }} />)
    const link = screen.getByRole('link', { name: 'Ir' })
    expect(link).toHaveAttribute('href', '/nuevo')
  })

  it('does not render action section when action is omitted', () => {
    render(<EmptyState icon={icon} title="T" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('has role="status" on the container', () => {
    render(<EmptyState icon={icon} title="T" />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
