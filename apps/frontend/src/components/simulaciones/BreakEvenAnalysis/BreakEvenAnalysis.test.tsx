import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { Product } from '@ultimate-pos/shared'
import { buildCatalog, DEFAULT_PARAMS } from '@/lib/simulaciones/calculations'
import { BreakEvenAnalysis } from './BreakEvenAnalysis'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function product(overrides: Partial<Product>): Product {
  return {
    id: 'a',
    store_id: 'store1',
    name: 'A',
    description: null,
    price: 100,
    cost: 60,
    sku: null,
    barcode: null,
    category_id: null,
    image_url: null,
    modifiers: [],
    points: null,
    stock_qty: null,
    track_inventory: false,
    low_stock_threshold: null,
    is_active: true,
    tax_exempt: false,
    pinned: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

const catalog = buildCatalog([
  product({ id: 'star', name: 'Star', price: 250, cost: 150 }),
  product({ id: 'other', name: 'Other', price: 100, cost: 90 }),
])

beforeAll(() => {
  ;(globalThis as any).ResizeObserver = ResizeObserverStub
  ;(globalThis as any).Element.prototype.scrollIntoView = () => {}
  ;(globalThis as any).Element.prototype.hasPointerCapture = () => false
  ;(globalThis as any).Element.prototype.setPointerCapture = () => {}
  ;(globalThis as any).Element.prototype.releasePointerCapture = () => {}
})

describe('BreakEvenAnalysis', () => {
  it('shows break-even for the default star product', () => {
    render(
      <BreakEvenAnalysis
        catalog={catalog}
        params={{ ...DEFAULT_PARAMS, eventCost: 10000 }}
        currency="MXN"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getAllByText(/Star/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('300').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Sell 100 of/)).toBeInTheDocument()
  })

  it('persists the selected star product', async () => {
    const onChange = vi.fn()
    const { userEvent } = await import('@testing-library/user-event')

    render(
      <BreakEvenAnalysis
        catalog={catalog}
        params={{ ...DEFAULT_PARAMS, eventCost: 10000 }}
        currency="MXN"
        onChange={onChange}
      />,
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByText(/Other/))
    expect(onChange).toHaveBeenCalledWith({ starProductId: 'other' })
  })
})