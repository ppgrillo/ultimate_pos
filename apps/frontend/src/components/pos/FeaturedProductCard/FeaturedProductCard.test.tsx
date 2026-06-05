import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { FeaturedProductCard } from './FeaturedProductCard'
import type { Product } from '@ultimate-pos/shared'

const product: Product = {
  id: 'p1', store_id: 's1', name: 'Elite Compression Suite',
  description: 'Thermal regulation and muscular support for elite athletes.',
  price: 299.99, cost: null, sku: null, category_id: null,
  image_url: null, points: 100, is_active: true,
  modifiers: [], created_at: '', updated_at: '',
}

describe('FeaturedProductCard', () => {
  it('renders product info and season launch badge', () => {
    render(<FeaturedProductCard product={product} onQuickBuy={vi.fn()} />)
    expect(screen.getByText('Season Launch')).toBeInTheDocument()
    expect(screen.getByText('Elite Compression Suite')).toBeInTheDocument()
    expect(screen.getByText(product.description!)).toBeInTheDocument()
    expect(screen.getByText('$299.99')).toBeInTheDocument()
    expect(screen.getByText('Quick Buy')).toBeInTheDocument()
  })

  it('calls onQuickBuy when button is clicked', async () => {
    const onQuickBuy = vi.fn()
    render(<FeaturedProductCard product={product} onQuickBuy={onQuickBuy} />)
    await userEvent.click(screen.getByText('Quick Buy'))
    expect(onQuickBuy).toHaveBeenCalledWith(product)
  })

  it('renders image when image_url is provided', () => {
    const withImage = { ...product, image_url: '/test.jpg' }
    render(<FeaturedProductCard product={withImage} onQuickBuy={vi.fn()} />)
    const img = screen.getByAltText('Elite Compression Suite')
    expect(img).toBeInTheDocument()
  })
})
