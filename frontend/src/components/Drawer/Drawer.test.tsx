import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Drawer from './Drawer'

describe('Drawer', () => {
  it('renders nothing when closed', () => {
    render(<Drawer open={false} onClose={vi.fn()} title="Panel"><p>Content</p></Drawer>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title and content when open', () => {
    render(<Drawer open={true} onClose={vi.fn()} title="Seguimiento"><p>Timeline aquí</p></Drawer>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Seguimiento')).toBeInTheDocument()
    expect(screen.getByText('Timeline aquí')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<Drawer open={true} onClose={onClose} title="T"><p>B</p></Drawer>)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when overlay backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<Drawer open={true} onClose={onClose} title="T"><p>B</p></Drawer>)
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does NOT call onClose when the drawer panel is clicked', async () => {
    const onClose = vi.fn()
    render(<Drawer open={true} onClose={onClose} title="T"><p>Contenido</p></Drawer>)
    await userEvent.click(screen.getByText('Contenido'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<Drawer open={true} onClose={onClose} title="T"><p>B</p></Drawer>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('accepts ReactNode as title', () => {
    render(
      <Drawer open={true} onClose={vi.fn()} title={<strong>Panel complejo</strong>}>
        <p>B</p>
      </Drawer>,
    )
    expect(screen.getByText('Panel complejo')).toBeInTheDocument()
  })
})
