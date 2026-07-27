import { render, screen } from '@/test/test-utils'
import { PosDesktopLayout } from './PosDesktopLayout'
import type { ProductCategory } from '@ultimate-pos/shared'

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  return {
    ...actual,
    useGetChecksQuery: () => ({ data: [], isFetching: false, refetch: vi.fn() }),
    useCloseCheckMutation: () => [vi.fn(), { isLoading: false }],
  }
})

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

  it('renders product search input', () => {
    render(
      <PosDesktopLayout
        categories={categories}
        products={<div>Products Grid</div>}
      />,
    )
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
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

  it('shows open tables panel when kitchen mode is enabled', () => {
    render(
      <PosDesktopLayout
        categories={categories}
        products={<div>Products Grid</div>}
        enableTablesView
      />,
      {
        preloadedState: {
          storeConfig: {
            currentStore: {
              id: 's1',
              name: 'Store',
              slug: 'store',
              address: null,
              phone: null,
              tax_rate: 0,
              currency: 'USD',
              owner_id: 'o1',
              is_active: true,
              settings: { hasKitchen: true },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        },
      },
    )

    expect(screen.getByText('Open Tables')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Workspace' })).toBeInTheDocument()
  })
})
