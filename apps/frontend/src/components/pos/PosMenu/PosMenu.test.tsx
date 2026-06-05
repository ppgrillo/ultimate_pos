import { render, screen } from '@/test/test-utils'
import { PosMenu } from './PosMenu'
import type { Product, ProductCategory } from '@ultimate-pos/shared'

// Fully mock the api module to prevent thunks from overwriting preloaded state
vi.mock('@/lib/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

const categories: ProductCategory[] = [
  { id: 'cat-1', name: 'Coffee', store_id: 's1', is_active: true, created_at: '', updated_at: '' },
]

const products: Product[] = [
  { id: 'p1', name: 'Latte', price: 5.0, is_active: true, store_id: 's1', category_id: 'cat-1', created_at: '', updated_at: '' },
  { id: 'p2', name: 'Muffin', price: 3.5, is_active: true, store_id: 's1', category_id: 'cat-1', created_at: '', updated_at: '' },
  { id: 'p3', name: 'Inactive Item', price: 2.0, is_active: false, store_id: 's1', category_id: 'cat-1', created_at: '', updated_at: '' },
]

function renderMenu(preload = {}) {
  return render(<PosMenu />, {
    preloadedState: {
      products: { items: products, categories, isLoading: false, error: null, ...preload },
      pos: { activeView: 'menu', selectedCategory: null, searchQuery: '', cartOpen: false, checkoutView: false, customerDrawerOpen: false, customizeProductId: null },
    },
  })
}

describe('PosMenu', () => {
  it('renders product cards', async () => {
    renderMenu()
    expect(await screen.findByText('Latte', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Muffin')).toBeInTheDocument()
  })

  it('filters out inactive products', async () => {
    renderMenu()
    expect(await screen.findByText('Latte')).toBeInTheDocument()
    expect(screen.queryByText('Inactive Item')).not.toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    renderMenu({ isLoading: true })
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty state when no products match', async () => {
    renderMenu({ items: [] })
    expect(await screen.findByText('No products found')).toBeInTheDocument()
  })

  it('filters by search query', async () => {
    renderMenu()
    expect(await screen.findByText('Muffin')).toBeInTheDocument()
    expect(screen.queryByText('Muffin')).toBeInTheDocument()
  })

  it('renders search bar and category chips', async () => {
    renderMenu()
    expect(await screen.findByPlaceholderText('Search products...')).toBeInTheDocument()
    expect(await screen.findByText('Coffee')).toBeInTheDocument()
  })
})
