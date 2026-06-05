import { render, screen } from '@/test/test-utils'
import { CheckoutPanel } from './CheckoutPanel'
import type { CartItem } from '@/store/slices/cartSlice'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/api/client', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
    get: vi.fn(),
  },
}))

const items: CartItem[] = [
  { product_id: 'p1', name: 'Latte', price: 5.0, quantity: 2, variant_label: '', modifiers: [], notes: null },
]

const defaultPreload = {
  cart: {
    items,
    customer_id: null,
    customer_name: null,
    customer_tier: null,
    table_number: null,
    order_type: 'dine-in' as const,
    discount: 0,
    notes: null,
    discount_label: null,
  },
}

describe('CheckoutPanel', () => {
  it('renders cart items and order summary', () => {
    render(<CheckoutPanel />, { preloadedState: defaultPreload })
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Items (1)')).toBeInTheDocument()
    expect(screen.getByText('Dining Option')).toBeInTheDocument()
    expect(screen.getByText('Order Summary')).toBeInTheDocument()
  })

  it('shows the charge button with total', () => {
    render(<CheckoutPanel />, { preloadedState: defaultPreload })
    expect(screen.getByText('Charge $10.00')).toBeInTheDocument()
  })

  it('shows secure transaction badge', () => {
    render(<CheckoutPanel />, { preloadedState: defaultPreload })
    expect(screen.getByText(/Secure transaction/)).toBeInTheDocument()
  })
})
