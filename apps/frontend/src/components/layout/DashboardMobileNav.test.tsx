import { render, screen } from '@/test/test-utils'
import { DashboardMobileNav } from './DashboardMobileNav'

const { mockPathname } = vi.hoisted(() => ({ mockPathname: { value: '/' } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => mockPathname.value,
}))

describe('DashboardMobileNav', () => {
  it('renders the dashboard nav outside POS routes', () => {
    mockPathname.value = '/customers'
    render(<DashboardMobileNav />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('Clientes')).toBeInTheDocument()
  })

  it('hides on /pos so it does not cover the POS bottom nav', () => {
    mockPathname.value = '/pos'
    render(<DashboardMobileNav />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('hides on /pos-kitchen so it does not cover the POS bottom nav', () => {
    mockPathname.value = '/pos-kitchen'
    render(<DashboardMobileNav />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
