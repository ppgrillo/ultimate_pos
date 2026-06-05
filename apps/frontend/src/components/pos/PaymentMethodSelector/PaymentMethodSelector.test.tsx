import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PaymentMethodSelector } from './PaymentMethodSelector'

describe('PaymentMethodSelector', () => {
  it('renders all payment methods', () => {
    render(<PaymentMethodSelector selected={null} onSelect={vi.fn()} />)
    expect(screen.getByText('NFC TAP')).toBeInTheDocument()
    expect(screen.getByText('QR PAY')).toBeInTheDocument()
    expect(screen.getByText('CHIP')).toBeInTheDocument()
  })

  it('highlights the selected method', () => {
    render(<PaymentMethodSelector selected="qr" onSelect={vi.fn()} />)
    const qr = screen.getByText('QR PAY')
    expect(qr.closest('button')).toHaveClass('border-primary')
  })

  it('calls onSelect when a method is clicked', async () => {
    const onSelect = vi.fn()
    render(<PaymentMethodSelector selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('NFC TAP'))
    expect(onSelect).toHaveBeenCalledWith('nfc')
  })
})
