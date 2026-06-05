import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ProductCard } from './ProductCard'
import type { Product } from '@ultimate-pos/shared'

const baseProduct: Product = {
  id: '1',
  name: 'Cappuccino',
  price: 4.5,
  is_active: true,
  store_id: 'store-1',
  category_id: 'cat-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

describe('ProductCard', () => {
  it('renders product name and price in compact mode', () => {
    render(<ProductCard product={baseProduct} onAdd={vi.fn()} />)
    expect(screen.getByText('Cappuccino')).toBeInTheDocument()
    expect(screen.getByText('$4.50')).toBeInTheDocument()
  })

  it('shows points badge when product has points', () => {
    const product = { ...baseProduct, points: 50 }
    render(<ProductCard product={product} onAdd={vi.fn()} />)
    expect(screen.getByText('+50 pts')).toBeInTheDocument()
  })

  it('calls onAdd when add button is clicked', async () => {
    const onAdd = vi.fn()
    render(<ProductCard product={baseProduct} onAdd={onAdd} />)
    const addBtn = screen.getByRole('button')
    await userEvent.click(addBtn)
    expect(onAdd).toHaveBeenCalledWith(baseProduct)
  })

  it('renders description in rich variant', () => {
    const product = { ...baseProduct, description: 'Rich espresso with steamed milk' }
    render(<ProductCard product={product} onAdd={vi.fn()} variant="rich" />)
    expect(screen.getByText('Rich espresso with steamed milk')).toBeInTheDocument()
  })

  it('renders Add to Cart text in rich variant', () => {
    render(<ProductCard product={baseProduct} onAdd={vi.fn()} variant="rich" />)
    expect(screen.getByText('Add to Cart')).toBeInTheDocument()
  })
})
