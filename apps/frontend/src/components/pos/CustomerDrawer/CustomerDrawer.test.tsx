import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CustomerDrawer } from './CustomerDrawer'
import type { Customer, LoyaltyCard } from '@ultimate-pos/shared'

const loyalty: LoyaltyCard = {
  id: 'l1', store_id: 's1', customer_id: 'c1',
  points: 2450, tier: 'platinum',
  google_pass_id: null, apple_pass_id: null,
  created_at: '', updated_at: '',
}

const customer: Customer & { loyalty?: LoyaltyCard } = {
  id: 'c1', store_id: 's1', name: 'Alex Rivera',
  email: 'alex@example.com', phone: null, notes: null,
  total_visits: 42, total_spent: 5600,
  created_at: '', updated_at: '',
  loyalty,
}

describe('CustomerDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<CustomerDrawer />, {
      preloadedState: {
        customers: { customers: [customer], selectedCustomer: customer, isLoading: false, error: null },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: false, customerDrawerOpen: false, customerBarExpanded: false,
          customizeProductId: null,
        },
      },
    })
    expect(container.innerHTML).toBe('')
  })

  it('renders bottom sheet when open', () => {
    render(<CustomerDrawer />, {
      preloadedState: {
        customers: { customers: [customer], selectedCustomer: customer, isLoading: false, error: null },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: false, customerDrawerOpen: true, customerBarExpanded: false,
          customizeProductId: null,
        },
      },
    })
    expect(screen.getByText('Customer Profile')).toBeInTheDocument()
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
    expect(screen.getByText('alex@example.com')).toBeInTheDocument()
    expect(screen.getByText('platinum')).toBeInTheDocument()
    expect(screen.getByText('42 visits')).toBeInTheDocument()
    expect(screen.getByText('2450')).toBeInTheDocument()
  })

  it('closes when close button is clicked', async () => {
    render(<CustomerDrawer />, {
      preloadedState: {
        customers: { customers: [customer], selectedCustomer: customer, isLoading: false, error: null },
        pos: {
          activeView: 'menu', selectedCategory: null, searchQuery: '',
          cartOpen: false, checkoutView: false, customerDrawerOpen: true, customerBarExpanded: false,
          customizeProductId: null,
        },
      },
    })
    const btns = screen.getAllByRole('button')
    const closeBtn = btns.find((b) => b.querySelector('svg'))
    expect(closeBtn).toBeDefined()
    if (closeBtn) await userEvent.click(closeBtn)
    await waitFor(() => {
      expect(screen.queryByText('Customer Profile')).not.toBeInTheDocument()
    })
  })
})
