import { render, screen } from '@/test/test-utils'
import { PosCart } from './PosCart'
import type { CartItem } from '@/store/slices/cartSlice'

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  return {
    ...actual,
    useGetChecksQuery: () => ({ data: [], isFetching: false, refetch: vi.fn() }),
    useCloseCheckMutation: () => [vi.fn(), { isLoading: false }],
  }
})

const items: CartItem[] = [
  { product_id: 'p1', name: 'Latte', price: 5.0, original_price: 5.0, quantity: 2, variant_label: '', modifiers: [], notes: null },
  { product_id: 'p2', name: 'Muffin', price: 3.5, original_price: 3.5, quantity: 1, variant_label: '', modifiers: [], notes: null },
]

const baseCart = {
  items,
  customer_id: null,
  customer_name: null,
  customer_tier: null,
  customer_points: 0,
  customer_loyalty_card_id: null,
  table_number: null,
  order_type: 'dine-in' as const,
  discount: 0,
  notes: null,
  discount_label: null,
  redeemed_points: 0,
  appliedPromotions: [],
  promoDiscount: 0,
}

describe('PosCart', () => {
  it('shows empty state when no items', () => {
    render(<PosCart />)
    expect(screen.getByText(/Cart is empty/i)).toBeInTheDocument()
  })

  it('renders items and total', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: baseCart,
      },
    })
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Muffin')).toBeInTheDocument()
    expect(screen.getByText('Current Order')).toBeInTheDocument()
  })

  it('shows item count', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: baseCart,
      },
    })
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('renders checkout button', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: baseCart,
      },
    })
    expect(screen.getByText('Checkout')).toBeInTheDocument()
  })

  it('shows open tables panel when hasKitchen is enabled', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: baseCart,
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
    })
    expect(screen.getByText('Open Tables')).toBeInTheDocument()
  })
})
