import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import SelfCheckoutPage from './page'

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok' }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/api/client', () => {
  const product = {
    id: 'apples',
    store_id: 's1',
    name: 'Apples',
    price: 2.5,
    is_bulk: true,
    bulk_unit: 'kg',
    bulk_step: 0.5,
    is_active: true,
    category_id: null,
    image_url: null,
    modifiers: [],
    points: null,
    created_at: '',
    updated_at: '',
  }
  return {
    setApiToken: vi.fn(),
    api: {
      get: vi.fn((path: string) => {
        if (path === '/self-checkout/verify') {
          return Promise.resolve({
            data: {
              store: { name: 'Store', slug: 'store', tax_rate: 0, settings: {} },
              station: { name: 'Kiosk' },
            },
          })
        }
        if (path === '/self-checkout/products') return Promise.resolve({ data: [product] })
        if (path === '/self-checkout/categories') return Promise.resolve({ data: [] })
        if (path === '/promotions') return Promise.resolve({ data: [] })
        return Promise.resolve({ data: [] })
      }),
      post: vi.fn(),
      upload: vi.fn(),
    },
  }
})

describe('SelfCheckoutPage bulk products', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: { applied_promotions: [], total_discount: 0 } }),
      })),
    )
  })

  it('adds a bulk product with a fractional quantity to the cart', async () => {
    render(<SelfCheckoutPage />)

    await userEvent.click(await screen.findByText('Continuar como invitado sin beneficios'))

    await userEvent.click(await screen.findByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Enter Quantity')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '0.5 kg' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to Cart' }))

    expect(await screen.findByText('0.5 kg')).toBeInTheDocument()
    expect(screen.getByText('$2.50 / kg')).toBeInTheDocument()
  })
})
