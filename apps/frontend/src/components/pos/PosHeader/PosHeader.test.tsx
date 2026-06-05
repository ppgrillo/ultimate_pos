import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PosHeader } from './PosHeader'

describe('PosHeader', () => {
  it('renders store logo and cart button', () => {
    render(<PosHeader onCartClick={vi.fn()} />)
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('QuickCharge POS')).toBeInTheDocument()
  })

  it('calls onCartClick when cart button is clicked', async () => {
    const onCartClick = vi.fn()
    render(<PosHeader onCartClick={onCartClick} />)
    const cartBtn = screen.getAllByRole('button')[1]
    await userEvent.click(cartBtn)
    expect(onCartClick).toHaveBeenCalledTimes(1)
  })
})
