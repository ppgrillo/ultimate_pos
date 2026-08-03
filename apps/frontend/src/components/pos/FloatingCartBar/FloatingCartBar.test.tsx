import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { FloatingCartBar } from './FloatingCartBar'

describe('FloatingCartBar', () => {
  it('renders nothing when cart is empty', () => {
    const { container } = render(<FloatingCartBar />, {
      preloadedState: {
        cart: {
          items: [], customer_id: null, customer_name: null, customer_tier: null,
          customer_points: 0, customer_loyalty_card_id: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
          redeemed_points: 0, appliedPromotions: [], promoDiscount: 0,
        },
      },
    })
    expect(container.innerHTML).toBe('')
  })

  it('shows item count and total when items exist', () => {
    render(<FloatingCartBar />, {
      preloadedState: {
        cart: {
          items: [
            { product_id: 'p1', name: 'Latte', price: 5, quantity: 2, variant_label: '', modifiers: [], notes: null },
          ],
          customer_id: null, customer_name: null, customer_tier: null,
          customer_points: 0, customer_loyalty_card_id: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
          redeemed_points: 0, appliedPromotions: [], promoDiscount: 0,
        },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: false, customerDrawerOpen: false, customerBarExpanded: false,
          customizeProductId: null, customerSelectSkipped: false, scannerOpen: false, kitchenNotice: null,
        },
      },
    })
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('2 items')).toBeInTheDocument()
    expect(screen.getByText('Checkout')).toBeInTheDocument()
  })

  it('renders nothing during checkout', () => {
    const { container } = render(<FloatingCartBar />, {
      preloadedState: {
        cart: {
          items: [
            { product_id: 'p1', name: 'Latte', price: 5, quantity: 1, variant_label: '', modifiers: [], notes: null },
          ],
          customer_id: null, customer_name: null, customer_tier: null,
          customer_points: 0, customer_loyalty_card_id: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
          redeemed_points: 0, appliedPromotions: [], promoDiscount: 0,
        },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: true, customerDrawerOpen: false, customerBarExpanded: false,
          customizeProductId: null, customerSelectSkipped: false, scannerOpen: false, kitchenNotice: null,
        },
      },
    })
    expect(container.innerHTML).toBe('')
  })

  it('uses controlled props and calls onCheckout', async () => {
    const onCheckout = vi.fn()
    render(
      <FloatingCartBar
        count={3}
        total={25}
        discount={5}
        onCheckout={onCheckout}
      />,
    )

    expect(screen.getByText('$20.00')).toBeInTheDocument()
    expect(screen.getByText('-$5.00 saved')).toBeInTheDocument()
    expect(screen.getByText('3 items')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Checkout'))
    expect(onCheckout).toHaveBeenCalledTimes(1)
  })

  it('renders nothing in controlled mode when count is zero', () => {
    const { container } = render(
      <FloatingCartBar
        count={0}
        total={0}
        onCheckout={() => {}}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
