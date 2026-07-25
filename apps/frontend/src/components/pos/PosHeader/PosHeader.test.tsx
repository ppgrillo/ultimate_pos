import { render, screen } from '@/test/test-utils'
import { PosHeader } from './PosHeader'

describe('PosHeader', () => {
  it('renders store logo', () => {
    render(<PosHeader />)
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText('QuickCharge POS')).toBeInTheDocument()
  })

  it('renders hamburger menu on mobile', () => {
    render(<PosHeader onMenuClick={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
