import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { DiningOptionToggle } from './DiningOptionToggle'

describe('DiningOptionToggle', () => {
  it('renders both options', () => {
    render(<DiningOptionToggle value="dine-in" onChange={vi.fn()} />)
    expect(screen.getByText('Dine-in')).toBeInTheDocument()
    expect(screen.getByText('Takeaway')).toBeInTheDocument()
  })

  it('highlights the selected option', () => {
    render(<DiningOptionToggle value="takeaway" onChange={vi.fn()} />)
    const takeaway = screen.getByText('Takeaway')
    expect(takeaway.closest('button')).toHaveClass('bg-primary')
  })

  it('calls onChange when clicking an option', async () => {
    const onChange = vi.fn()
    render(<DiningOptionToggle value="dine-in" onChange={onChange} />)
    await userEvent.click(screen.getByText('Takeaway'))
    expect(onChange).toHaveBeenCalledWith('takeaway')
  })
})
