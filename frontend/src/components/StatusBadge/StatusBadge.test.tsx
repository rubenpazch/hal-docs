import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  describe('document variant (default)', () => {
    it('renders the Spanish label for a known status', () => {
      render(<StatusBadge status="registrado" />)
      expect(screen.getByText('Registrado')).toBeInTheDocument()
    })

    it('falls back to the raw status when unknown', () => {
      render(<StatusBadge status="custom_status" />)
      expect(screen.getByText('custom_status')).toBeInTheDocument()
    })

    it('sets data-status and data-variant attributes', () => {
      render(<StatusBadge status="derivado" />)
      const badge = screen.getByText('Derivado')
      expect(badge).toHaveAttribute('data-status', 'derivado')
      expect(badge).toHaveAttribute('data-variant', 'document')
    })

    it.each([
      ['registrado', 'Registrado'],
      ['en_proceso',  'En Proceso'],
      ['derivado',    'Derivado'],
      ['respondido',  'Respondido'],
      ['archivado',   'Archivado'],
      ['anulado',     'Anulado'],
      ['devuelto',    'Devuelto'],
      ['finalizado',  'Finalizado'],
    ])('shows correct label for %s', (status, expected) => {
      render(<StatusBadge status={status} />)
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })

  describe('submission variant', () => {
    it('renders En Revisión for en_revision', () => {
      render(<StatusBadge status="en_revision" variant="submission" />)
      expect(screen.getByText('En Revisión')).toBeInTheDocument()
    })

    it('sets data-variant="submission"', () => {
      render(<StatusBadge status="observado" variant="submission" />)
      expect(screen.getByText('Observado')).toHaveAttribute('data-variant', 'submission')
    })
  })

  describe('certificate variant', () => {
    it.each([
      ['valid',    'Vigente'],
      ['expiring', 'Por vencer'],
      ['expired',  'Vencido'],
    ])('shows correct label for %s', (status, expected) => {
      render(<StatusBadge status={status} variant="certificate" />)
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })

  it('accepts an extra className', () => {
    render(<StatusBadge status="registrado" className="extra" />)
    expect(screen.getByText('Registrado').className).toContain('extra')
  })
})
