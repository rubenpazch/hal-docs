import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TableSkeleton, SkeletonCard } from './Skeleton'

describe('TableSkeleton', () => {
  it('renders the default number of rows (5)', () => {
    render(
      <table>
        <tbody>
          <TableSkeleton />
        </tbody>
      </table>,
    )
    // each row is aria-hidden; count <tr> elements
    const rows = document.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(5)
  })

  it('renders the requested row count', () => {
    render(
      <table>
        <tbody>
          <TableSkeleton rows={3} cols={2} />
        </tbody>
      </table>,
    )
    expect(document.querySelectorAll('tbody tr')).toHaveLength(3)
  })

  it('renders the correct number of cells per row', () => {
    render(
      <table>
        <tbody>
          <TableSkeleton rows={1} cols={6} />
        </tbody>
      </table>,
    )
    expect(document.querySelectorAll('tbody tr td')).toHaveLength(6)
  })

  it('marks rows as aria-hidden', () => {
    render(
      <table>
        <tbody>
          <TableSkeleton rows={2} />
        </tbody>
      </table>,
    )
    document.querySelectorAll('tbody tr').forEach((row) => {
      expect(row).toHaveAttribute('aria-hidden', 'true')
    })
  })
})

describe('SkeletonCard', () => {
  it('renders the default number of lines (3)', () => {
    render(<SkeletonCard />)
    // each line div is inside the card; count by checking parent children
    const card = document.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(card.children).toHaveLength(3)
  })

  it('renders the requested line count', () => {
    render(<SkeletonCard lines={5} />)
    const card = document.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(card.children).toHaveLength(5)
  })

  it('is aria-hidden', () => {
    render(<SkeletonCard />)
    expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })
})
