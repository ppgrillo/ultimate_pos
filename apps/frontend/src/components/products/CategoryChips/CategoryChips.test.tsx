import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryChips } from './CategoryChips'

const categories = [
  { id: '1', name: 'Coffee' },
  { id: '2', name: 'Pastries' },
  { id: '3', name: 'Tea' },
]

describe('CategoryChips', () => {
  it('renders all categories', () => {
    render(
      <CategoryChips categories={categories} selectedId={null} onSelect={vi.fn()} />,
    )

    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('Pastries')).toBeInTheDocument()
    expect(screen.getByText('Tea')).toBeInTheDocument()
  })

  it('highlights selected category', () => {
    render(
      <CategoryChips categories={categories} selectedId="2" onSelect={vi.fn()} />,
    )

    const selected = screen.getByText('Pastries')
    expect(selected).toHaveClass('bg-primary')
  })

  it('calls onSelect when chip is clicked', async () => {
    const onSelect = vi.fn()
    render(
      <CategoryChips categories={categories} selectedId={null} onSelect={onSelect} />,
    )

    await userEvent.click(screen.getByText('Coffee'))
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('deselects when selected chip is clicked', async () => {
    const onSelect = vi.fn()
    render(
      <CategoryChips categories={categories} selectedId="1" onSelect={onSelect} />,
    )

    await userEvent.click(screen.getByText('Coffee'))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('shows empty state when no categories', () => {
    render(
      <CategoryChips categories={[]} selectedId={null} onSelect={vi.fn()} />,
    )

    expect(screen.getByText('No categories available')).toBeInTheDocument()
  })
})
