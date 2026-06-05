import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { DesktopLeftNav } from './DesktopLeftNav'

describe('DesktopLeftNav', () => {
  it('renders nav tabs and logo', () => {
    render(<DesktopLeftNav activeTab="shop" onTabChange={vi.fn()} />)
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('NeoPOS')).toBeInTheDocument()
    expect(screen.getByText('Shop')).toBeInTheDocument()
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders user profile at bottom', () => {
    render(<DesktopLeftNav activeTab="shop" onTabChange={vi.fn()} />)
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
  })

  it('highlights active tab', () => {
    render(<DesktopLeftNav activeTab="shop" onTabChange={vi.fn()} />)
    const shopBtn = screen.getByText('Shop')
    expect(shopBtn.className).toContain('text-primary')
  })

  it('calls onTabChange when tab is clicked', async () => {
    const onTabChange = vi.fn()
    render(<DesktopLeftNav activeTab="shop" onTabChange={onTabChange} />)
    await userEvent.click(screen.getByText('Settings'))
    expect(onTabChange).toHaveBeenCalledWith('settings')
  })
})
