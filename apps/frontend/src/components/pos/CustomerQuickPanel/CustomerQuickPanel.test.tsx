import { render, screen } from '@/test/test-utils'
import { CustomerQuickPanel } from './CustomerQuickPanel'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

const customer: CustomerWithLoyalty = {
  id: 'c1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  store_id: 's1',
  phone: null,
  total_visits: 12,
  total_spent: 250.0,
  created_at: '',
  updated_at: '',
  loyalty: { points: 450, tier: 'Gold' },
}

describe('CustomerQuickPanel', () => {
  it('renders nothing when no customer is selected', () => {
    const { container } = render(<CustomerQuickPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders customer name from store', () => {
    render(<CustomerQuickPanel />, {
      preloadedState: {
        customers: {
          customers: [],
          selectedCustomer: customer,
          isLoading: false,
          error: null,
        },
      },
    })
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders cart customer name when set', () => {
    render(<CustomerQuickPanel />, {
      preloadedState: {
        cart: {
          items: [],
          customer_id: 'c1',
          customer_name: 'John',
          customer_tier: null,
          table_number: null,
          order_type: 'dine-in',
          discount: 0,
          notes: null,
          discount_label: null,
        },
        customers: {
          customers: [],
          selectedCustomer: null,
          isLoading: false,
          error: null,
        },
      },
    })
    expect(screen.getByText('John')).toBeInTheDocument()
  })
})
