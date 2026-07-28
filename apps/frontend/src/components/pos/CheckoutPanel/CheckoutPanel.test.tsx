import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CheckoutPanel } from './CheckoutPanel'
import type { CartItem } from '@/store/slices/cartSlice'

const mockPush = vi.fn()
const mockApiPost = vi.fn()
const mockApiGet = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: any[]) => mockApiPost(...args),
    get: (...args: any[]) => mockApiGet(...args),
  },
}))

const items: CartItem[] = [
  { product_id: 'p1', name: 'Latte', price: 5.0, original_price: 5.0, quantity: 2, variant_label: '', modifiers: [], notes: null },
]

const defaultPreload = {
  cart: {
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
  },
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
      settings: { hasKitchen: true, checkoutMode: 'order-only' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
}

describe('CheckoutPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue({ data: { id: 'check-1' } })
    mockApiPost.mockResolvedValue({ data: { id: 'ord-1', earned_points: 0 } })
  })

  it('renders cart items and order summary', () => {
    render(<CheckoutPanel />, { preloadedState: defaultPreload })
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Items (1)')).toBeInTheDocument()
    expect(screen.getByText('Dining Option')).toBeInTheDocument()
    expect(screen.getByText('Order Summary')).toBeInTheDocument()
  })

  it('shows table input for dine-in kitchen flow', () => {
    render(<CheckoutPanel />, { preloadedState: defaultPreload })
    expect(screen.getByText('Table Number')).toBeInTheDocument()
  })

  it('blocks dine-in submit without table number', async () => {
    render(<CheckoutPanel />, { preloadedState: defaultPreload })

    await userEvent.click(screen.getByText('Charge $10.00'))
    expect(screen.getByText('Table number is required for dine-in orders')).toBeInTheDocument()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('submits add-on flow and redirects to receipt when table is set', async () => {
    render(<CheckoutPanel />, {
      preloadedState: {
        ...defaultPreload,
        cart: {
          ...defaultPreload.cart,
          table_number: 12,
        },
      },
    })

    await userEvent.click(screen.getByText('Charge $10.00'))

    expect(mockApiGet).toHaveBeenCalledWith('/checks/active', { params: { tableNumber: '12' } })
    expect(mockApiPost).toHaveBeenCalledWith('/checks/check-1/orders', expect.any(Object))
    expect(mockPush).not.toHaveBeenCalled()
  })
})
