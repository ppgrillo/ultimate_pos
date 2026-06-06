import { render, screen } from '@/test/test-utils'
import { PosLayout } from './PosLayout'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pos',
}))

describe('PosLayout', () => {
  it('renders header, menu content, and bottom nav', () => {
    render(
      <PosLayout
        menu={<div>Menu Content</div>}
        cart={<div>Cart Content</div>}
        checkout={<div>Checkout Content</div>}
        customerDrawer={<div>Customer Drawer</div>}
      />,
    )
    expect(screen.getByText('Menu Content')).toBeInTheDocument()
    expect(screen.getByText('QuickCharge POS')).toBeInTheDocument()
  })

  it('shows cart panel when cartOpen is true', () => {
    render(
      <PosLayout
        menu={<div>Menu Content</div>}
        cart={<div>Cart Panel</div>}
        checkout={<div>Checkout Content</div>}
        customerDrawer={<div>Customer Drawer</div>}
      />,
      {
        preloadedState: {
          pos: {
            activeView: 'menu',
            selectedCategory: null,
            searchQuery: '',
            cartOpen: true,
            checkoutView: false,
            customerDrawerOpen: false,
            customizeProductId: null,
          },
        },
      },
    )
    expect(screen.getByText('Cart Panel')).toBeInTheDocument()
  })

  it('shows checkout panel when in checkout view', () => {
    render(
      <PosLayout
        menu={<div>Menu Content</div>}
        cart={<div>Cart Content</div>}
        checkout={<div>Checkout Panel</div>}
        customerDrawer={<div>Customer Drawer</div>}
      />,
      {
        preloadedState: {
          pos: {
            activeView: 'menu',
            selectedCategory: null,
            searchQuery: '',
            cartOpen: false,
            checkoutView: true,
            customerDrawerOpen: false,
            customizeProductId: null,
          },
        },
      },
    )
    expect(screen.getByText('Checkout Panel')).toBeInTheDocument()
  })

  it('shows customer drawer when open', () => {
    render(
      <PosLayout
        menu={<div>Menu Content</div>}
        cart={<div>Cart Content</div>}
        checkout={<div>Checkout Content</div>}
        customerDrawer={<div>Drawer Open</div>}
      />,
      {
        preloadedState: {
          pos: {
            activeView: 'menu',
            selectedCategory: null,
            searchQuery: '',
            cartOpen: false,
            checkoutView: false,
            customerDrawerOpen: true,
            customizeProductId: null,
          },
        },
      },
    )
    expect(screen.getByText('Drawer Open')).toBeInTheDocument()
  })
})
