import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FormSection from './FormSection'

describe('FormSection', () => {
  it('renders children', () => {
    render(
      <FormSection>
        <input placeholder="Nombre" />
        <input placeholder="Email" />
      </FormSection>,
    )
    expect(screen.getByPlaceholderText('Nombre')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  it('renders the title when provided', () => {
    render(<FormSection title="Información personal"><input /></FormSection>)
    expect(screen.getByText('Información personal')).toBeInTheDocument()
  })

  it('does not render a heading when title is omitted', () => {
    render(<FormSection><input /></FormSection>)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('defaults to 2-column grid', () => {
    render(<FormSection><input /></FormSection>)
    expect(document.querySelector('[data-cols="2"]')).toBeInTheDocument()
  })

  it('sets data-cols attribute correctly', () => {
    const { rerender } = render(<FormSection columns={1}><input /></FormSection>)
    expect(document.querySelector('[data-cols="1"]')).toBeInTheDocument()

    rerender(<FormSection columns={3}><input /></FormSection>)
    expect(document.querySelector('[data-cols="3"]')).toBeInTheDocument()
  })

  it('renders as a <section> element', () => {
    render(<FormSection><input /></FormSection>)
    expect(document.querySelector('section')).toBeInTheDocument()
  })
})
