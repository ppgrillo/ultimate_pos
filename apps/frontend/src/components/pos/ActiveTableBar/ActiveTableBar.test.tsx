import { render, screen } from '@/test/test-utils'
import { ActiveTableBar } from './ActiveTableBar'

const storeConfig = (hasKitchen: boolean) => ({
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
    settings: { hasKitchen },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
})

const baseCart = {
  items: [],
  customer_id: null,
  customer_name: null,
  customer_tier: null,
  customer_points: 0,
  customer_loyalty_card_id: null,
  table_number: 12,
  order_type: 'dine-in' as const,
  discount: 0,
  notes: null,
  discount_label: null,
  redeemed_points: 0,
  appliedPromotions: [],
  promoDiscount: 0,
}

describe('ActiveTableBar', () => {
  it('shows the selected table for the kitchen dine-in flow', () => {
    render(<ActiveTableBar />, {
      preloadedState: { cart: baseCart, storeConfig: storeConfig(true) },
    })
    expect(screen.getByText('Mesa 12')).toBeInTheDocument()
  })

  it('hides when no table is selected', () => {
    render(<ActiveTableBar />, {
      preloadedState: { cart: { ...baseCart, table_number: null }, storeConfig: storeConfig(true) },
    })
    expect(screen.queryByText('Mesa 12')).not.toBeInTheDocument()
  })

  it('hides when the store has no kitchen', () => {
    render(<ActiveTableBar />, {
      preloadedState: { cart: baseCart, storeConfig: storeConfig(false) },
    })
    expect(screen.queryByText('Mesa 12')).not.toBeInTheDocument()
  })

  it('hides for non dine-in orders', () => {
    render(<ActiveTableBar />, {
      preloadedState: { cart: { ...baseCart, order_type: 'takeaway' as const }, storeConfig: storeConfig(true) },
    })
    expect(screen.queryByText('Mesa 12')).not.toBeInTheDocument()
  })
})
