import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CategoryChips } from './CategoryChips'
import type { ProductCategory } from '@ultimate-pos/shared'

const categories: ProductCategory[] = [
  { id: '1', name: 'Coffee', store_id: 's1', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Pastries', store_id: 's1', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Tea', store_id: 's1', is_active: true, created_at: '', updated_at: '' },
]

describe('CategoryChips', () => {
  it('renders all categories including All Items', () => {
    render(<CategoryChips categories={categories} selectedId={null} onSelect={vi.fn()} />)
    expect(screen.getByText('All Items')).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('Pastries')).toBeInTheDocument()
    expect(screen.getByText('Tea')).toBeInTheDocument()
  })

  it('highlights selected category', () => {
    render(<CategoryChips categories={categories} selectedId="2" onSelect={vi.fn()} />)
    const pastries = screen.getByText('Pastries')
    expect(pastries.closest('button')).toHaveClass('bg-primary')
  })

  it('calls onSelect with null for All Items', async () => {
    const onSelect = vi.fn()
    render(<CategoryChips categories={categories} selectedId={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('All Items'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('calls onSelect with category id', async () => {
    const onSelect = vi.fn()
    render(<CategoryChips categories={categories} selectedId={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Tea'))
    expect(onSelect).toHaveBeenCalledWith('3')
  })
})
