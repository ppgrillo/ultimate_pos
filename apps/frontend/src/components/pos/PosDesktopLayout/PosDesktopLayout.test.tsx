import { render, screen } from '@/test/test-utils'
import { PosDesktopLayout } from './PosDesktopLayout'
import type { ProductCategory } from '@ultimate-pos/shared'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const categories: ProductCategory[] = [
  { id: '1', name: 'Coffee', store_id: 's1', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Pastries', store_id: 's1', is_active: true, created_at: '', updated_at: '' },
]

describe('PosDesktopLayout', () => {
  it('renders category pills', () => {
    render(
      <PosDesktopLayout
        categories={categories}
        products={<div>Products Grid</div>}
      />,
    )
    expect(screen.getByText('All Items')).toBeInTheDocument()
    expect(screen.getByText('Coffee')).toBeInTheDocument()
    expect(screen.getByText('Pastries')).toBeInTheDocument()
  })

  it('renders search input and scan barcode', () => {
    render(
      <PosDesktopLayout
        categories={categories}
        products={<div>Products Grid</div>}
      />,
    )
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    expect(screen.getByText('Scan')).toBeInTheDocument()
  })

  it('shows customer select screen when cart is empty', () => {
    render(
      <PosDesktopLayout
        categories={categories}
        products={<div>Products Grid</div>}
      />,
    )
    expect(screen.getByPlaceholderText('Search customers...')).toBeInTheDocument()
    expect(screen.getByText('Search for a customer')).toBeInTheDocument()
    expect(screen.getByText('Cart is empty')).toBeInTheDocument()
    expect(screen.getByText('Add products to get started')).toBeInTheDocument()
  })
})
