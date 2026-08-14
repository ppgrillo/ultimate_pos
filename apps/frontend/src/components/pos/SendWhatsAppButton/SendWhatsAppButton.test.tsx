import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { SendWhatsAppButton } from './SendWhatsAppButton'

describe('SendWhatsAppButton', () => {
  it('renders nothing when there are no wallet links', () => {
    const { container } = render(<SendWhatsAppButton />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens wa.me with the phone and the Spanish message', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(
      <SendWhatsAppButton
        applePassUrl="/api/wallet/apple/p1/download"
        googleSaveUrl="https://pay.google.com/g/1"
        customerPhone="+52 55 1234 5678"
      />,
    )

    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    expect(openSpy).toHaveBeenCalledTimes(1)
    const url = openSpy.mock.calls[0][0] as string
    expect(url.startsWith('https://wa.me/525512345678?text=')).toBe(true)
    expect(decodeURIComponent(url)).toContain('¡Tu tarjeta digital de fidelidad está lista!')
    openSpy.mockRestore()
  })

  it('falls back to wa.me without a phone number', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<SendWhatsAppButton applePassUrl="/api/wallet/apple/p1/download" />)

    await user.click(screen.getByRole('button', { name: /enviar por whatsapp/i }))

    const url = openSpy.mock.calls[0][0] as string
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    openSpy.mockRestore()
  })

  it('renders a compact icon-only button when iconOnly is set', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<SendWhatsAppButton applePassUrl="/api/wallet/apple/p1/download" iconOnly />)

    await user.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }))

    expect(screen.getByRole('button', { name: 'Enviar por WhatsApp' })).toHaveClass('rounded-full')
    const url = openSpy.mock.calls[0][0] as string
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    openSpy.mockRestore()
  })

  it('is disabled and shows a spinner while loading the Google Wallet link', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const user = userEvent.setup()
    render(<SendWhatsAppButton applePassUrl="/api/wallet/apple/p1/download" loading />)

    const btn = screen.getByRole('button', { name: 'Preparando tarjeta de fidelidad' })
    expect(btn).toBeDisabled()
    expect(screen.getByText('Preparando tarjeta…')).toBeInTheDocument()

    await user.click(btn).catch(() => {})
    expect(openSpy).not.toHaveBeenCalled()
    openSpy.mockRestore()
  })
})
