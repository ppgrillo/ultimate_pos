import { render, screen } from '@/test/test-utils'
import { CustomizeProduct } from './CustomizeProduct'
import type { Product } from '@ultimate-pos/shared'

const product: Product = {
  id: 'p1',
  name: 'Cappuccino',
  price: 4.5,
  description: 'Rich espresso with steamed milk',
  is_active: true,
  store_id: 's1',
  category_id: 'cat-1',
  modifiers: [
    {
      name: 'Milk Choice',
      type: 'single',
      is_required: true,
      sort_order: 0,
      options: [
        { name: 'Whole Milk', price_adjustment: 0, sort_order: 0 },
        { name: 'Oat Milk', price_adjustment: 0.5, sort_order: 1 },
      ],
    },
  ],
  created_at: '',
  updated_at: '',
}

describe('CustomizeProduct', () => {
  it('renders nothing when no product is selected', () => {
    const { container } = render(<CustomizeProduct />)
    expect(container.firstChild).toBeNull()
  })

  it('renders product name and price', () => {
    render(<CustomizeProduct />, {
      preloadedState: {
        products: {
          items: [product],
          categories: [],
          isLoading: false,
          error: null,
        },
        pos: {
          activeView: 'menu',
          selectedCategory: null,
          searchQuery: '',
          cartOpen: false,
          checkoutView: false,
          customerDrawerOpen: false,
          customizeProductId: 'p1',
        },
      },
    })
    expect(screen.getByText('Cappuccino')).toBeInTheDocument()
    const prices = screen.getAllByText('$4.50')
    expect(prices.length).toBeGreaterThanOrEqual(1)
  })

  it('renders modifier group', () => {
    render(<CustomizeProduct />, {
      preloadedState: {
        products: {
          items: [product],
          categories: [],
          isLoading: false,
          error: null,
        },
        pos: {
          activeView: 'menu',
          selectedCategory: null,
          searchQuery: '',
          cartOpen: false,
          checkoutView: false,
          customerDrawerOpen: false,
          customizeProductId: 'p1',
        },
      },
    })
    expect(screen.getByText('Milk Choice')).toBeInTheDocument()
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText('Oat Milk')).toBeInTheDocument()
  })

  it('shows required badge for required groups', () => {
    render(<CustomizeProduct />, {
      preloadedState: {
        products: {
          items: [product],
          categories: [],
          isLoading: false,
          error: null,
        },
        pos: {
          activeView: 'menu',
          selectedCategory: null,
          searchQuery: '',
          cartOpen: false,
          checkoutView: false,
          customerDrawerOpen: false,
          customizeProductId: 'p1',
        },
      },
    })
    expect(screen.getByText('Required')).toBeInTheDocument()
  })

  it('renders quantity section', () => {
    render(<CustomizeProduct />, {
      preloadedState: {
        products: {
          items: [product],
          categories: [],
          isLoading: false,
          error: null,
        },
        pos: {
          activeView: 'menu',
          selectedCategory: null,
          searchQuery: '',
          cartOpen: false,
          checkoutView: false,
          customerDrawerOpen: false,
          customizeProductId: 'p1',
        },
      },
    })
    expect(screen.getByText('Quantity')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders Add to Cart button', () => {
    render(<CustomizeProduct />, {
      preloadedState: {
        products: {
          items: [product],
          categories: [],
          isLoading: false,
          error: null,
        },
        pos: {
          activeView: 'menu',
          selectedCategory: null,
          searchQuery: '',
          cartOpen: false,
          checkoutView: false,
          customerDrawerOpen: false,
          customizeProductId: 'p1',
        },
      },
    })
    expect(screen.getByText('Add to Cart')).toBeInTheDocument()
  })

  it('shows price adjustment for paid options', () => {
    render(<CustomizeProduct />, {
      preloadedState: {
        products: {
          items: [product],
          categories: [],
          isLoading: false,
          error: null,
        },
        pos: {
          activeView: 'menu',
          selectedCategory: null,
          searchQuery: '',
          cartOpen: false,
          checkoutView: false,
          customerDrawerOpen: false,
          customizeProductId: 'p1',
        },
      },
    })
    expect(screen.getByText('+$0.50')).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
  })
})
