import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { ProductForm } from './ProductForm'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  const categories: unknown[] = []
  return {
    ...actual,
    useGetCategoriesQuery: () => ({ data: categories, isLoading: false }),
  }
})

const settingsState = (hasVariants: boolean) => ({
  storeConfig: {
    status: 'ready' as const,
    currentStore: {
      id: 's1',
      name: 'Store',
      slug: 'store',
      address: null,
      phone: null,
      tax_rate: 0,
      currency: 'USD',
      owner_id: 'o1',
      is_active: true,
      settings: { hasVariants, hasKitchen: false, checkoutMode: 'order-only' },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  },
})

describe('ProductForm selling mode', () => {
  it('defaults to per piece and hides bulk fields', () => {
    render(<ProductForm />, { preloadedState: settingsState(true) as never })
    expect(screen.getByText('Per piece')).toBeInTheDocument()
    expect(screen.queryByText('Increment Step')).not.toBeInTheDocument()
  })

  it('reveals unit and step controls when switching to bulk', async () => {
    render(<ProductForm />, { preloadedState: settingsState(true) as never })
    await userEvent.click(screen.getByText('By weight / bulk'))
    expect(screen.getByText('Increment Step')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'kg' })).toBeInTheDocument()
  })

  it('hides the variants section for bulk products', async () => {
    render(<ProductForm />, { preloadedState: settingsState(true) as never })
    expect(screen.getByText('Variants & Extras')).toBeInTheDocument()
    await userEvent.click(screen.getByText('By weight / bulk'))
    expect(screen.queryByText('Variants & Extras')).not.toBeInTheDocument()
  })
})
