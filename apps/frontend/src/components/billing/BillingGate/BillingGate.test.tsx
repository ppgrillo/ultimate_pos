import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillingGate } from './BillingGate'

const mocks = vi.hoisted(() => ({
  useGetBillingStatusQuery: vi.fn(),
  useCreateCheckoutSessionMutation: vi.fn(),
  useCreatePortalSessionMutation: vi.fn(),
  useRefreshBillingMutation: vi.fn(),
  useAppSelector: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('@/store/api', () => ({
  useGetBillingStatusQuery: mocks.useGetBillingStatusQuery,
  useCreateCheckoutSessionMutation: mocks.useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation: mocks.useCreatePortalSessionMutation,
  useRefreshBillingMutation: mocks.useRefreshBillingMutation,
}))

vi.mock('@/store/hooks', () => ({
  useAppSelector: mocks.useAppSelector,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: mocks.useSearchParams,
}))

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react')
  return { ...(actual as Record<string, unknown>) }
})

function setupStatus({ hasAccess = false, status = 'inactive' } = {}) {
  mocks.useGetBillingStatusQuery.mockReturnValue({
    data: { hasAccess, status, currentPeriodEnd: null },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  })
}

function setupLoading() {
  mocks.useGetBillingStatusQuery.mockReturnValue({
    data: undefined,
    isError: false,
    isFetching: true,
    refetch: vi.fn(),
  })
}

function setupError() {
  mocks.useGetBillingStatusQuery.mockReturnValue({
    data: undefined,
    isError: true,
    isFetching: false,
    refetch: vi.fn(),
  })
}

function setupMutation() {
  const createCheckout = vi.fn()
  mocks.useCreateCheckoutSessionMutation.mockReturnValue([createCheckout, { isLoading: false }])
  mocks.useCreatePortalSessionMutation.mockReturnValue([vi.fn(), { isLoading: false }])
  mocks.useRefreshBillingMutation.mockReturnValue([vi.fn()])
  return createCheckout
}

describe('BillingGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useSearchParams.mockReturnValue(new URLSearchParams())
    mocks.useAppSelector.mockReturnValue(false)
    setupMutation()
  })

  it('renders children when the session user has access', () => {
    mocks.useAppSelector.mockReturnValue(true)
    setupStatus({ hasAccess: true, status: 'active' })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('renders children when billing status has access', () => {
    setupStatus({ hasAccess: true, status: 'active' })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('shows a loading state (strict gate) while the status is still loading', () => {
    setupLoading()

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    expect(screen.getByRole('status', { name: 'Cargando acceso' })).toBeInTheDocument()
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument()
    expect(screen.queryByText('Activa tu suscripción')).not.toBeInTheDocument()
  })

  it('uses standard re-check options (no per-mount refetch, focus + 24h polling)', () => {
    mocks.useAppSelector.mockReturnValue(false)
    setupStatus({ hasAccess: false, status: 'inactive' })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    const [, options] = mocks.useGetBillingStatusQuery.mock.calls[0]
    expect(options).toMatchObject({
      skip: false,
      refetchOnFocus: true,
      pollingInterval: 86400000,
    })
    expect(options.refetchOnMountOrArgChange).toBeUndefined()
  })

  it('renders children (fail-open) when the status request errors', () => {
    setupError()

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.queryByText('Activa tu suscripción')).not.toBeInTheDocument()
  })

  it('renders the paywall when there is no access', () => {
    setupStatus({ hasAccess: false, status: 'inactive' })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    expect(screen.getByText('Activa tu suscripción')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument()
  })

  it('starts the checkout flow when the user clicks subscribe', async () => {
    setupStatus({ hasAccess: false, status: 'inactive' })
    const createCheckout = setupMutation()
    const assignMock = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign: assignMock })
    createCheckout.mockReturnValue({ unwrap: () => Promise.resolve({ url: 'https://checkout.stripe.com/abc' }) })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    await userEvent.click(screen.getByRole('button', { name: /suscribirme ahora/i }))

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.com/abc'))
    vi.unstubAllGlobals()
  })

  it('refetches billing status when checkout reports the subscription is already active', async () => {
    setupStatus({ hasAccess: false, status: 'inactive' })
    const createCheckout = setupMutation()
    const refetchMock = vi.fn()
    mocks.useGetBillingStatusQuery.mockReturnValue({
      data: { hasAccess: false, status: 'inactive', currentPeriodEnd: null },
      isLoading: false,
      refetch: refetchMock,
    })
    createCheckout.mockReturnValue({ unwrap: () => Promise.resolve({ url: null, alreadyActive: true }) })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    await userEvent.click(screen.getByRole('button', { name: /suscribirme ahora/i }))

    await waitFor(() => expect(refetchMock).toHaveBeenCalled())
  })

  it('shows the manage subscription button for past-due status', () => {
    setupStatus({ hasAccess: false, status: 'past_due' })

    render(
      <BillingGate>
        <p>Dashboard content</p>
      </BillingGate>,
    )

    expect(screen.getByRole('button', { name: /actualizar método de pago/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /administrar mi suscripción/i })).toBeInTheDocument()
  })
})
