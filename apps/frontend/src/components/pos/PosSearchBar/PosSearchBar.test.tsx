import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PosSearchBar } from './PosSearchBar'

describe('PosSearchBar', () => {
  it('renders search input', () => {
    render(<PosSearchBar value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument()
  })

  it('calls onChange when typing', async () => {
    const onChange = vi.fn()
    render(<PosSearchBar value="muffin" onChange={onChange} />)
    const input = screen.getByPlaceholderText('Search products...')
    await userEvent.type(input, 'latte')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows scan button when onScanClick is provided', () => {
    render(<PosSearchBar value="" onChange={vi.fn()} onScanClick={vi.fn()} />)
    expect(screen.getByTitle('Scan barcode or QR')).toBeInTheDocument()
  })
})
