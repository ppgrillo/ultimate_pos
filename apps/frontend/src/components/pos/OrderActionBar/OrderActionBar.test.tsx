import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { OrderActionBar } from './OrderActionBar'

describe('OrderActionBar', () => {
  it('renders buttons in disabled state when cart is empty', () => {
    render(<OrderActionBar onCheckout={vi.fn()} />, {
      preloadedState: {
        cart: {
          items: [], customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    expect(screen.getByText('Promo')).toBeDisabled()
    expect(screen.getByText('Clear All')).toBeDisabled()
    expect(screen.getByText('Complete Checkout')).toBeDisabled()
  })

  it('shows total from cart items', () => {
    render(<OrderActionBar onCheckout={vi.fn()} />, {
      preloadedState: {
        cart: {
          items: [
            { product_id: 'p1', name: 'Latte', price: 5, quantity: 2, variant_label: '', modifiers: [], notes: null },
            { product_id: 'p2', name: 'Muffin', price: 3.5, quantity: 1, variant_label: '', modifiers: [], notes: null },
          ],
          customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    expect(screen.getByText('$13.50')).toBeInTheDocument()
  })

  it('enables buttons when items exist', () => {
    render(<OrderActionBar onCheckout={vi.fn()} />, {
      preloadedState: {
        cart: {
          items: [
            { product_id: 'p1', name: 'Latte', price: 5, quantity: 1, variant_label: '', modifiers: [], notes: null },
          ],
          customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    expect(screen.getByText('Complete Checkout')).toBeEnabled()
  })

  it('calls onCheckout when clicked', async () => {
    const onCheckout = vi.fn()
    render(<OrderActionBar onCheckout={onCheckout} />, {
      preloadedState: {
        cart: {
          items: [
            { product_id: 'p1', name: 'Latte', price: 5, quantity: 1, variant_label: '', modifiers: [], notes: null },
          ],
          customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    await userEvent.click(screen.getByText('Complete Checkout'))
    expect(onCheckout).toHaveBeenCalledTimes(1)
  })

  it('shows submitting state', () => {
    render(<OrderActionBar onCheckout={vi.fn()} isSubmitting />, {
      preloadedState: {
        cart: {
          items: [
            { product_id: 'p1', name: 'Latte', price: 5, quantity: 1, variant_label: '', modifiers: [], notes: null },
          ],
          customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })
})
