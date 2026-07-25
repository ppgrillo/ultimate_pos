import { render, screen } from '@/test/test-utils'
import { MobileBottomNav } from './MobileBottomNav'
import { ShoppingCart, ClipboardList, ContactRound, BarChart3 } from 'lucide-react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/pos',
}))

const tabs = [
  { id: 'pos', label: 'POS', icon: ShoppingCart, href: '/pos' },
  { id: 'orders', label: 'Órdenes', icon: ClipboardList, href: '/orders' },
  { id: 'customers', label: 'Clientes', icon: ContactRound, href: '/customers' },
  { id: 'analytics', label: 'Estadísticas', icon: BarChart3, href: '/analytics' },
]

describe('MobileBottomNav', () => {
  it('renders all 4 nav tabs', () => {
    render(<MobileBottomNav tabs={tabs} />)
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('Órdenes')).toBeInTheDocument()
    expect(screen.getByText('Clientes')).toBeInTheDocument()
    expect(screen.getByText('Estadísticas')).toBeInTheDocument()
  })

  it('renders links with correct hrefs', () => {
    render(<MobileBottomNav tabs={tabs} />)
    const posLink = screen.getByText('POS').closest('a')
    expect(posLink).toHaveAttribute('href', '/pos')
    const ordersLink = screen.getByText('Órdenes').closest('a')
    expect(ordersLink).toHaveAttribute('href', '/orders')
  })

  it('shows badge when badge > 0', () => {
    const tabsWithBadge = [...tabs]
    tabsWithBadge[0] = { ...tabsWithBadge[0], badge: 3 }
    render(<MobileBottomNav tabs={tabsWithBadge} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('does not show badge when badge is 0', () => {
    const tabsWithBadge = [...tabs]
    tabsWithBadge[0] = { ...tabsWithBadge[0], badge: 0 }
    render(<MobileBottomNav tabs={tabsWithBadge} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('does not show badge when badge is undefined', () => {
    render(<MobileBottomNav tabs={tabs} />)
    const nav = screen.getByRole('navigation')
    const badges = nav.querySelectorAll('.rounded-full')
    expect(badges.length).toBe(0)
  })
})
