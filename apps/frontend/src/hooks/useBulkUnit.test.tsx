import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { renderHook } from '@testing-library/react'
import { createTestStore } from '@/test/test-utils'
import { useBulkUnit } from './useBulkUnit'
import type { Product } from '@ultimate-pos/shared'

const queryProducts: Product[] = []

vi.mock('@/store/api', async () => {
  const actual = await vi.importActual<any>('@/store/api')
  return {
    ...actual,
    useGetProductsQuery: () => ({ data: queryProducts, isLoading: false }),
  }
})

const sliceProduct = (over: Partial<Product>): Product => ({
  id: 'apples',
  name: 'Apples',
  price: 2.5,
  is_active: true,
  store_id: 's1',
  created_at: '',
  updated_at: '',
  ...over,
})

function makeWrapper(preloadedState?: never) {
  const store = createTestStore(preloadedState)
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
}

describe('useBulkUnit', () => {
  it('resolves the unit label for a bulk product from the products slice', () => {
    const { result } = renderHook(() => useBulkUnit(), {
      wrapper: makeWrapper({
        products: {
          items: [sliceProduct({ is_bulk: true, bulk_unit: 'kg', bulk_step: 0.1 })],
          categories: [],
        },
      } as never),
    })
    expect(result.current('apples')).toBe('kg')
  })

  it('returns null for a non-bulk product', () => {
    const { result } = renderHook(() => useBulkUnit(), {
      wrapper: makeWrapper({
        products: { items: [sliceProduct({ is_bulk: false })], categories: [] },
      } as never),
    })
    expect(result.current('apples')).toBeNull()
  })

  it('returns null when the product is unknown or the id is missing', () => {
    const { result } = renderHook(() => useBulkUnit(), {
      wrapper: makeWrapper(undefined),
    })
    expect(result.current('missing')).toBeNull()
    expect(result.current(null)).toBeNull()
    expect(result.current(undefined)).toBeNull()
  })
})
