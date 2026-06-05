import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { RightPanelCustomer } from './RightPanelCustomer'
import type { Customer, LoyaltyCard } from '@ultimate-pos/shared'

const loyalty: LoyaltyCard = {
  id: 'l1', store_id: 's1', customer_id: 'c1',
  points: 12450, tier: 'gold',
  google_pass_id: null, apple_pass_id: null,
  created_at: '', updated_at: '',
}

const customer: Customer & { loyalty?: LoyaltyCard } = {
  id: 'c1', store_id: 's1', name: 'Sarah Jenkins',
  email: 'sarah@example.com', phone: null, notes: null,
  total_visits: 42, total_spent: 3200,
  created_at: '', updated_at: '',
  loyalty,
}

describe('RightPanelCustomer', () => {
  it('shows search button when no customer selected', () => {
    render(<RightPanelCustomer />, {
      preloadedState: {
        customers: { customers: [customer], selectedCustomer: null, isLoading: false, error: null },
        cart: {
          items: [], customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    expect(screen.getByText('Search customer...')).toBeInTheDocument()
  })

  it('shows customer info when selected', () => {
    render(<RightPanelCustomer />, {
      preloadedState: {
        customers: { customers: [customer], selectedCustomer: customer, isLoading: false, error: null },
        cart: {
          items: [], customer_id: 'c1', customer_name: 'Sarah Jenkins', customer_tier: 'gold',
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument()
    expect(screen.getByText('gold')).toBeInTheDocument()
    expect(screen.getByText('12450 Points')).toBeInTheDocument()
    expect(screen.getByText('3 Coupons Available')).toBeInTheDocument()
  })

  it('filters customers by search query', async () => {
    render(<RightPanelCustomer />, {
      preloadedState: {
        customers: { customers: [customer], selectedCustomer: null, isLoading: false, error: null },
        cart: {
          items: [], customer_id: null, customer_name: null, customer_tier: null,
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
      },
    })
    await userEvent.click(screen.getByText('Search customer...'))
    const input = screen.getByPlaceholderText('Search customers...')
    await userEvent.type(input, 'Sarah')
    expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument()
  })
})
