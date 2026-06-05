import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PosBottomNav } from './PosBottomNav'

describe('PosBottomNav', () => {
  it('renders all nav tabs', () => {
    render(<PosBottomNav activeTab="shop" onTabChange={vi.fn()} />)
    expect(screen.getByText('Shop')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    render(<PosBottomNav activeTab="customers" onTabChange={vi.fn()} />)
    const customers = screen.getByText('Customers')
    expect(customers.closest('button')).toHaveClass('text-primary')
  })

  it('calls onTabChange when a tab is clicked', async () => {
    const onTabChange = vi.fn()
    render(<PosBottomNav activeTab="shop" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByText('Stats'))
    expect(onTabChange).toHaveBeenCalledWith('stats')
  })
})
