import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Breadcrumb from './Breadcrumb'

function renderBreadcrumb(items: Parameters<typeof Breadcrumb>[0]['items']) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>,
  )
}

describe('Breadcrumb', () => {
  it('renders all labels', () => {
    renderBreadcrumb([
      { label: 'Usuarios', href: '/usuarios' },
      { label: 'Nuevo usuario' },
    ])
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Nuevo usuario')).toBeInTheDocument()
  })

  it('renders intermediate items as links', () => {
    renderBreadcrumb([
      { label: 'Usuarios', href: '/usuarios' },
      { label: 'Nuevo usuario' },
    ])
    const link = screen.getByRole('link', { name: 'Usuarios' })
    expect(link).toHaveAttribute('href', '/usuarios')
  })

  it('renders the last item as plain text with aria-current="page"', () => {
    renderBreadcrumb([
      { label: 'Usuarios', href: '/usuarios' },
      { label: 'Nuevo usuario' },
    ])
    const current = screen.getByText('Nuevo usuario')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(current.tagName).not.toBe('A')
  })

  it('renders a single item without a separator', () => {
    renderBreadcrumb([{ label: 'Inicio' }])
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Inicio')).toBeInTheDocument()
  })

  it('has a nav with aria-label="breadcrumb"', () => {
    renderBreadcrumb([{ label: 'Inicio' }])
    expect(screen.getByRole('navigation', { name: 'breadcrumb' })).toBeInTheDocument()
  })

  it('renders 3-level deep breadcrumb correctly', () => {
    renderBreadcrumb([
      { label: 'Admin', href: '/admin' },
      { label: 'Áreas', href: '/admin/areas' },
      { label: 'Editar área' },
    ])
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByText('Editar área')).toHaveAttribute('aria-current', 'page')
  })
})
