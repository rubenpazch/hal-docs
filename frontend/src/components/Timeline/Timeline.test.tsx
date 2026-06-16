import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Timeline, { type TimelineEvent } from './Timeline'

const events: TimelineEvent[] = [
  {
    date: '2026-01-10T10:00:00Z',
    event: 'Documento registrado',
    status: 'registrado',
  },
  {
    date: '2026-01-11T14:30:00Z',
    event: 'Derivado a Mesa de Partes',
    status: 'derivado',
    from_area: 'Recepción',
    area: 'Mesa de Partes',
    notes: 'Urgente',
  },
]

describe('Timeline', () => {
  it('renders the empty state when no events', () => {
    render(<Timeline events={[]} />)
    expect(screen.getByText('Sin eventos registrados aún.')).toBeInTheDocument()
  })

  it('renders a custom empty message', () => {
    render(<Timeline events={[]} emptyMessage="No hay historial." />)
    expect(screen.getByText('No hay historial.')).toBeInTheDocument()
  })

  it('renders each event description', () => {
    render(<Timeline events={events} />)
    expect(screen.getByText('Documento registrado')).toBeInTheDocument()
    expect(screen.getByText('Derivado a Mesa de Partes')).toBeInTheDocument()
  })

  it('renders status badge labels', () => {
    render(<Timeline events={events} />)
    expect(screen.getByText('Registrado')).toBeInTheDocument()
    expect(screen.getByText('Derivado')).toBeInTheDocument()
  })

  it('renders from_area and to_area when present', () => {
    render(<Timeline events={events} />)
    expect(screen.getByText('Desde: Recepción')).toBeInTheDocument()
    expect(screen.getByText('Hacia: Mesa de Partes')).toBeInTheDocument()
  })

  it('renders notes when present', () => {
    render(<Timeline events={events} />)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('does not render area section when absent', () => {
    render(<Timeline events={[events[0]]} />)
    expect(screen.queryByText(/Desde:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Hacia:/)).not.toBeInTheDocument()
  })

  it('renders the correct number of list items', () => {
    render(<Timeline events={events} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks the last item with data-last="true"', () => {
    render(<Timeline events={events} />)
    const items = screen.getAllByRole('listitem')
    expect(items[items.length - 1]).toHaveAttribute('data-last', 'true')
    expect(items[0]).toHaveAttribute('data-last', 'false')
  })
})
