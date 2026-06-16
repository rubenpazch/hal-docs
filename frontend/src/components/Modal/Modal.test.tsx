import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Modal from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Test"><p>Body</p></Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title and body when open', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Confirmar"><p>¿Seguro?</p></Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="T"><p>B</p></Modal>)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="T"><p>B</p></Modal>)
    // The overlay is the dialog element itself
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose when the panel content is clicked', async () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="T"><p>Contenido</p></Modal>)
    await userEvent.click(screen.getByText('Contenido'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="T"><p>B</p></Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders footer when provided', () => {
    render(
      <Modal
        open={true}
        onClose={vi.fn()}
        title="T"
        footer={<button>Guardar</button>}
      >
        <p>B</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('does not render footer section when omitted', () => {
    render(<Modal open={true} onClose={vi.fn()} title="T"><p>B</p></Modal>)
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('has aria-modal and aria-labelledby attributes', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Accesible"><p>B</p></Modal>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
  })
})
