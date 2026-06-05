import { render, screen } from '@/test/test-utils'
import { PosCart } from './PosCart'
import type { CartItem } from '@/store/slices/cartSlice'

const items: CartItem[] = [
  { product_id: 'p1', name: 'Latte', price: 5.0, quantity: 2, variant_label: '', modifiers: [], notes: null },
  { product_id: 'p2', name: 'Muffin', price: 3.5, quantity: 1, variant_label: '', modifiers: [], notes: null },
]

describe('PosCart', () => {
  it('shows empty state when no items', () => {
    render(<PosCart />)
    expect(screen.getByText(/Cart is empty/i)).toBeInTheDocument()
  })

  it('renders items and total', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: {
          items,
          customer_id: null,
          customer_name: null,
          customer_tier: null,
          table_number: null,
          order_type: 'dine-in',
          discount: 0,
          notes: null,
          discount_label: null,
        },
      },
    })
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Muffin')).toBeInTheDocument()
    expect(screen.getByText('Current Order')).toBeInTheDocument()
  })

  it('shows item count', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: {
          items,
          customer_id: null,
          customer_name: null,
          customer_tier: null,
          table_number: null,
          order_type: 'dine-in',
          discount: 0,
          notes: null,
          discount_label: null,
        },
      },
    })
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('renders checkout button', () => {
    render(<PosCart />, {
      preloadedState: {
        cart: {
          items,
          customer_id: null,
          customer_name: null,
          customer_tier: null,
          table_number: null,
          order_type: 'dine-in',
          discount: 0,
          notes: null,
          discount_label: null,
        },
      },
    })
    expect(screen.getByText('Checkout')).toBeInTheDocument()
  })
})
