import { render, screen } from '@/test/test-utils'
import { OrderSummary } from './OrderSummary'

describe('OrderSummary', () => {
  it('renders subtotal', () => {
    render(<OrderSummary subtotal={25.5} discount={0} discountLabel="" />)
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('$25.50')).toBeInTheDocument()
  })

  it('shows discount line when discount is provided', () => {
    render(<OrderSummary subtotal={50} discount={5} discountLabel="Promo 10%" />)
    expect(screen.getByText('Promo 10%')).toBeInTheDocument()
  })

  it('shows total when showTotal is true', () => {
    render(<OrderSummary subtotal={30} discount={0} discountLabel="" showTotal />)
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('calculates total correctly with discount and tax', () => {
    render(<OrderSummary subtotal={30} discount={5} discountLabel="Coupon" showTotal />)
    expect(screen.getByText('$27.40')).toBeInTheDocument()
  })

  it('shows zero tax when taxEnabled is false', () => {
    render(<OrderSummary subtotal={30} discount={5} discountLabel="Coupon" taxEnabled={false} showTotal />)
    expect(screen.getByText('$25.00')).toBeInTheDocument()
  })
})
