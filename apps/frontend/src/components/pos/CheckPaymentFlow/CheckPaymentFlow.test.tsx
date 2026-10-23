import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CheckPaymentFlow } from './CheckPaymentFlow'
import type { CheckForPayment } from './CheckPaymentFlow'
import { readyStoreState } from '@/test/test-utils'

const mockPush = vi.fn()
const onOpenChange = vi.fn()
const onClosed = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const closeCheckMock = vi.fn()
const cancelCheckMpMock = vi.fn()

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  return {
    ...actual,
    useCloseCheckMutation: () => [closeCheckMock, { isLoading: false }],
    useCancelCheckMpMutation: () => [cancelCheckMpMock, { isLoading: false }],
  }
})

const check = { id: 'chk-1', table_number: 8, total: 20 } as unknown as CheckForPayment

const transferOnly = {
  ...readyStoreState,
  currentStore: {
    ...readyStoreState.currentStore,
    settings: { acceptedPaymentMethods: ['transfer'] },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CheckPaymentFlow', () => {
  it('closes a cash check and navigates to the receipt', async () => {
    const user = userEvent.setup()
    closeCheckMock.mockReturnValue({ unwrap: () => Promise.resolve({ total: 20 }) })

    render(<CheckPaymentFlow check={check} open onOpenChange={onOpenChange} onClosed={onClosed} />)

    await user.click(screen.getByRole('button', { name: /cash/i }))
    await user.type(screen.getByRole('spinbutton'), '20')
    await user.click(screen.getByRole('button', { name: /charge/i }))

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/pos/receipt?paymentMethod=cash')),
    )
    expect(mockPush.mock.calls[0][0]).toContain('total=20')
    expect(onClosed).toHaveBeenCalled()
  })

  it('hands a card check off to the terminal and waits for payment', async () => {
    closeCheckMock.mockReturnValue({
      unwrap: () => Promise.resolve({ total: 37, providerOrderId: 'MP_9', awaiting_payment: true }),
    })

    render(
      <CheckPaymentFlow
        check={check}
        open
        onOpenChange={onOpenChange}
        onClosed={onClosed}
      />,
      { preloadedState: { storeConfig: transferOnly } },
    )

    expect(await screen.findByText(/Enviando orden a la terminal/i)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
    expect(onClosed).not.toHaveBeenCalled()
  })

  it('surfaces a close error without navigating', async () => {
    closeCheckMock.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: 'Amount given must be at least the total' } }),
    })

    render(
      <CheckPaymentFlow check={check} open onOpenChange={onOpenChange} onClosed={onClosed} />,
      { preloadedState: { storeConfig: transferOnly } },
    )

    expect(
      await screen.findByText('Amount given must be at least the total'),
    ).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
