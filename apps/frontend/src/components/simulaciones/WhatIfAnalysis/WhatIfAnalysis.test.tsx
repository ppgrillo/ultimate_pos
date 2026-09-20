import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { Product } from '@ultimate-pos/shared'
import { buildCatalog, DEFAULT_PARAMS } from '@/lib/simulaciones/calculations'
import { WhatIfAnalysis } from './WhatIfAnalysis'

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
  product({ id: 'a', name: 'A', price: 100, cost: 60 }),
  product({ id: 'b', name: 'B', price: 200, cost: 100 }),
])

describe('WhatIfAnalysis', () => {
  it('renders the P&L for the selected volume', () => {
    render(
      <WhatIfAnalysis
        catalog={catalog}
        params={{ ...DEFAULT_PARAMS, eventCost: 10000, whatIfUnits: 2500 }}
        currency="MXN"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('MX$375,000.00')).toBeInTheDocument()
    expect(screen.getByText('MX$175,000.00')).toBeInTheDocument()
    expect(screen.getAllByText('MX$165,000.00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('17.5×')).toBeInTheDocument()
    expect(screen.getByText('Why 3×?')).toBeInTheDocument()
  })

  it('recaps the net result for the current fee', () => {
    render(
      <WhatIfAnalysis
        catalog={catalog}
        params={{ ...DEFAULT_PARAMS, eventCost: 10000, whatIfUnits: 2500 }}
        currency="MXN"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Your fee')).toBeInTheDocument()
    expect(screen.getByText(/Net at 2,500 units · break-even at/)).toBeInTheDocument()
  })

  it('offers small volume presets and a step-by-one input', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const onChange = vi.fn()
    render(
      <WhatIfAnalysis
        catalog={catalog}
        params={{ ...DEFAULT_PARAMS, eventCost: 10000 }}
        currency="MXN"
        onChange={onChange}
      />,
    )

    expect(screen.getByLabelText('Units to sell')).toHaveAttribute('step', '1')
    expect(screen.getByLabelText('Units to sell')).toHaveValue(30)
    for (const label of ['10', '20', '50', '100', '500', '1,000']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole('button', { name: '500' }))
    expect(onChange).toHaveBeenCalledWith({ whatIfUnits: 500 })
  })

  it('reveals the per-product breakdown the simulation is built from', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    render(
      <WhatIfAnalysis
        catalog={catalog}
        params={{ ...DEFAULT_PARAMS, eventCost: 10000 }}
        currency="MXN"
        onChange={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByText(/What this simulation is built from/))
    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(screen.getByText('MX$40.00')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })
})