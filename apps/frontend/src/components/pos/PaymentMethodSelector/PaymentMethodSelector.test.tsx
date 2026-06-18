import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PaymentMethodSelector } from './PaymentMethodSelector'

describe('PaymentMethodSelector', () => {
  it('renders all payment methods by default', () => {
    render(<PaymentMethodSelector selected={null} onSelect={vi.fn()} />)
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('filters methods by acceptedMethods', () => {
    render(<PaymentMethodSelector selected={null} onSelect={vi.fn()} acceptedMethods={['cash', 'card']} />)
    expect(screen.getByText('Cash')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
  })

  it('highlights the selected method', () => {
    render(<PaymentMethodSelector selected="cash" onSelect={vi.fn()} />)
    const cash = screen.getByText('Cash')
    expect(cash.closest('button')).toHaveClass('border-primary')
  })

  it('calls onSelect when a method is clicked', async () => {
    const onSelect = vi.fn()
    render(<PaymentMethodSelector selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Card'))
    expect(onSelect).toHaveBeenCalledWith('card')
  })

  it('shows amount on selected method', () => {
    render(<PaymentMethodSelector selected="cash" onSelect={vi.fn()} amount={2500} />)
    expect(screen.getByText('$2,500.00')).toBeInTheDocument()
  })
})
