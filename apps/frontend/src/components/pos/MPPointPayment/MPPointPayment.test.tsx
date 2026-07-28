import { render, screen, act } from '@/test/test-utils'
import { MPPointPayment } from './MPPointPayment'
import { orderUpdated } from '@/store/slices/orderSlice'
import { createTestStore } from '@/test/test-utils'
import type { Order } from '@ultimate-pos/shared'
import { Provider } from 'react-redux'

const mockOrder = (overrides: Partial<Order> & { metadata?: Record<string, unknown> }): Order => ({
  id: 'ord_001',
  store_id: 'store_1',
  customer_id: null,
  status: 'pending',
  type: 'takeaway',
  subtotal: 50,
  tax: 0,
  discount: 0,
  total: 50,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [],
  payments: [],
  customer: null,
  ...overrides,
  metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'created', ...overrides.metadata },
})

function renderWithStore(ui: React.ReactElement, preloadedOrders?: Order[]) {
  const store = createTestStore(preloadedOrders
    ? { order: { items: preloadedOrders, loading: false, error: null, activeTab: 'active' as const } }
    : undefined,
  )
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  }
}

describe('MPPointPayment', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    orderId: 'ord_001',
    total: 50,
    onPaid: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders modal when open is true', () => {
    renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    expect(screen.getByText('Enviando orden a la terminal...')).toBeInTheDocument()
  })

  it('does not render content when open is false', () => {
    renderWithStore(<MPPointPayment {...defaultProps} open={false} />, [mockOrder({})])
    expect(screen.queryByText('Enviando orden a la terminal...')).not.toBeInTheDocument()
  })

  it('displays the total amount', () => {
    renderWithStore(<MPPointPayment {...defaultProps} total={99.99} />, [mockOrder({})])
    expect(screen.getByText('$99.99')).toBeInTheDocument()
  })

  it('shows at_terminal state from Redux metadata', () => {
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'at_terminal' } })))
    })
    expect(screen.getByText('Acerca la tarjeta a la terminal Point')).toBeInTheDocument()
  })

  it('shows processing state from Redux metadata', () => {
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'processing' } })))
    })
    expect(screen.getByText('Procesando pago...')).toBeInTheDocument()
  })

  it('calls onPaid after 2 seconds when paid state is reached', () => {
    const onPaid = vi.fn()
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} onPaid={onPaid} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'paid' } })))
    })
    expect(screen.getByText('Pago exitoso')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onPaid).toHaveBeenCalledTimes(1)
  })

  it('shows failed state with Cancel and Retry buttons', () => {
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'failed' } })))
    })
    expect(screen.getByText('Pago fallido')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })

  it('shows expired state', () => {
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'expired' } })))
    })
    expect(screen.getByText('Tiempo de espera agotado')).toBeInTheDocument()
  })

  it('shows canceled state', () => {
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'canceled' } })))
    })
    expect(screen.getByText('Pago cancelado')).toBeInTheDocument()
  })

  it('shows action_required with button that resets to at_terminal', () => {
    const { store } = renderWithStore(<MPPointPayment {...defaultProps} />, [mockOrder({})])
    act(() => {
      store.dispatch(orderUpdated(mockOrder({ metadata: { mpOrderId: 'MP_ORD_001', mpOrderStatus: 'action_required' } })))
    })
    expect(screen.getByText('Revisa la terminal')).toBeInTheDocument()
    act(() => {
      screen.getByText('Ya revisé').click()
    })
    expect(screen.getByText('Acerca la tarjeta a la terminal Point')).toBeInTheDocument()
  })
})
