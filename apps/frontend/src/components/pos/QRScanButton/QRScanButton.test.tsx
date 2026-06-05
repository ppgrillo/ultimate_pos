import { render, screen } from '@/test/test-utils'
import { QRScanButton } from './QRScanButton'

describe('QRScanButton', () => {
  it('renders with correct title', () => {
    render(<QRScanButton />)
    const btn = screen.getByTitle('Scan customer QR code')
    expect(btn).toBeInTheDocument()
  })
})
