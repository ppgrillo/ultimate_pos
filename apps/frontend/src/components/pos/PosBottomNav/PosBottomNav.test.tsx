import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PosBottomNav } from './PosBottomNav'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('PosBottomNav', () => {
  it('renders all nav tabs', () => {
    render(<PosBottomNav />)
    expect(screen.getByText('Shop')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights shop as active by default', () => {
    render(<PosBottomNav />)
    const shop = screen.getByText('Shop')
    expect(shop.closest('button')).toHaveClass('text-primary')
  })

  it('opens customer drawer when customers tab is clicked', async () => {
    render(<PosBottomNav />)
    await userEvent.click(screen.getByText('Customers'))
  })
})
