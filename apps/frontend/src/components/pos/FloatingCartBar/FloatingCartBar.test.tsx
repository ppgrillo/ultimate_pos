import { render, screen } from '@/test/test-utils'
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
})
