import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createTestStore } from '@/test/test-utils'
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

  it('closes when close button is clicked but keeps the customer selected', async () => {
    const store = createTestStore({
      customers: { customers: [customer], selectedCustomer: customer, isLoading: false, error: null },
      pos: {
        activeView: 'menu', selectedCategory: null, searchQuery: '',
        cartOpen: false, checkoutView: false, customerDrawerOpen: true, customerBarExpanded: false,
        customizeProductId: null,
      },
      cart: {
        items: [], customer_id: 'c1', customer_name: 'Alex Rivera',
        customer_tier: 'platinum', customer_points: 2450, customer_loyalty_card_id: 'l1',
        order_type: 'dine_in', table: null,
      },
    })
    render(
      <Provider store={store}>
        <CustomerDrawer />
      </Provider>,
    )

    const btns = screen.getAllByRole('button')
    const closeBtn = btns.find((b) => b.getAttribute('aria-label') === 'Close')
    expect(closeBtn).toBeDefined()
    if (closeBtn) await userEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText('Customer Profile')).not.toBeInTheDocument()
      expect(store.getState().pos.customerDrawerOpen).toBe(false)
      expect(store.getState().customers.selectedCustomer?.id).toBe('c1')
      expect(store.getState().cart.customer_id).toBe('c1')
    })
  })

  it('fully deselects the customer when Remove is clicked', async () => {
    const store = createTestStore({
      customers: { customers: [customer], selectedCustomer: customer, isLoading: false, error: null },
      pos: {
        activeView: 'menu', selectedCategory: null, searchQuery: '',
        cartOpen: false, checkoutView: false, customerDrawerOpen: true, customerBarExpanded: false,
        customizeProductId: null,
      },
      cart: {
        items: [], customer_id: 'c1', customer_name: 'Alex Rivera',
        customer_tier: 'platinum', customer_points: 2450, customer_loyalty_card_id: 'l1',
        order_type: 'dine_in', table: null,
      },
    })
    render(
      <Provider store={store}>
        <CustomerDrawer />
      </Provider>,
    )

    const btns = screen.getAllByRole('button')
    const removeBtn = btns.find((b) => b.getAttribute('aria-label') === 'Remove customer')
    expect(removeBtn).toBeDefined()
    if (removeBtn) await userEvent.click(removeBtn)

    await waitFor(() => {
      expect(store.getState().cart.customer_id).toBeNull()
      expect(store.getState().cart.customer_name).toBeNull()
      expect(store.getState().customers.selectedCustomer).toBeNull()
      expect(store.getState().pos.customerDrawerOpen).toBe(false)
    })
  })
})
