import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CustomerQuickBar } from './CustomerQuickBar'

function renderQuickBar(overrides = {}) {
  return render(<CustomerQuickBar />, {
    preloadedState: {
      customers: { customers: [], selectedCustomer: null, isLoading: false, error: null, ...overrides },
      cart: {
        items: [], customer_id: null, customer_name: null, customer_tier: null,
        table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
      },
      pos: {
        activeView: 'menu', selectedCategory: null, searchQuery: '',
        cartOpen: false, checkoutView: false, customerDrawerOpen: false, customerBarExpanded: false,
        customizeProductId: null,
      },
    },
  })
}

describe('CustomerQuickBar', () => {
  it('renders nothing when no customer', () => {
    const { container } = renderQuickBar()
    expect(container.innerHTML).toBe('')
  })

  it('renders customer name and initial', () => {
    render(<CustomerQuickBar />, {
      preloadedState: {
        customers: { customers: [], selectedCustomer: null, isLoading: false, error: null },
        cart: {
          items: [], customer_id: 'c1', customer_name: 'Alex R.', customer_tier: 'platinum',
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: false, customerDrawerOpen: false, customerBarExpanded: false,
          customizeProductId: null,
        },
      },
    })
    expect(screen.getByText('Alex R.')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('platinum')).toBeInTheDocument()
  })

  it('shows expanded stats when toggled', async () => {
    render(<CustomerQuickBar />, {
      preloadedState: {
        customers: { customers: [], selectedCustomer: null, isLoading: false, error: null },
        cart: {
          items: [], customer_id: 'c1', customer_name: 'Alex R.', customer_tier: 'gold',
          table_number: null, order_type: 'dine-in', discount: 0, notes: null, discount_label: null,
        },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: false, customerDrawerOpen: false, customerBarExpanded: false,
          customizeProductId: null,
        },
      },
    })
    await userEvent.click(screen.getByText('Alex R.'))
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('View Profile')).toBeInTheDocument()
  })
})
