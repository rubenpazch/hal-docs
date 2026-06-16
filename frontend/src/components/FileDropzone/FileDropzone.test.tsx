import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import FileDropzone from './FileDropzone'

function makeFile(name: string, size = 1024, type = 'application/pdf'): File {
  return new File(['x'.repeat(size)], name, { type })
}

describe('FileDropzone', () => {
  it('renders the drop zone', () => {
    render(<FileDropzone files={[]} onFiles={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText(/Arrastra archivos/)).toBeInTheDocument()
  })

  it('renders the hint when provided', () => {
    render(
      <FileDropzone
        files={[]}
        onFiles={vi.fn()}
        onRemove={vi.fn()}
        hint="Solo PDF, máx 20 MB"
      />,
    )
    expect(screen.getByText('Solo PDF, máx 20 MB')).toBeInTheDocument()
  })

  it('does not render the file list when empty', () => {
    render(<FileDropzone files={[]} onFiles={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders existing files', () => {
    const files = [makeFile('documento.pdf'), makeFile('anexo.pdf')]
    render(<FileDropzone files={files} onFiles={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('documento.pdf')).toBeInTheDocument()
    expect(screen.getByText('anexo.pdf')).toBeInTheDocument()
  })

  it('calls onRemove when the remove button is clicked', async () => {
    const onRemove = vi.fn()
    const files = [makeFile('doc.pdf')]
    render(<FileDropzone files={files} onFiles={vi.fn()} onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar doc.pdf' }))
    expect(onRemove).toHaveBeenCalledWith('doc.pdf')
  })

  it('renders file sizes', () => {
    const files = [makeFile('big.pdf', 2 * 1024 * 1024)]
    render(<FileDropzone files={files} onFiles={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })

  it('renders KB size for small files', () => {
    const files = [makeFile('small.pdf', 512)]
    render(<FileDropzone files={files} onFiles={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByText('512 B')).toBeInTheDocument()
  })

  it('has a hidden file input', () => {
    render(<FileDropzone files={[]} onFiles={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByTestId('dropzone-input')).toBeInTheDocument()
  })
})
