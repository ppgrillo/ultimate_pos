import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { Product } from '@ultimate-pos/shared'
import { buildCatalog } from '@/lib/simulaciones/calculations'
import { BreakEvenChart } from './BreakEvenChart'

function product(overrides: Partial<Product>): Product {
  return {
    id: 'a',
    store_id: 'store1',
    name: 'A',
    description: null,
    price: 400,
    cost: 200,
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

const catalog = buildCatalog([product({ id: 'a', price: 400, cost: 200 })])

describe('BreakEvenChart', () => {
  it('renders a chart with the break-even marker', () => {
    const { container } = render(
      <BreakEvenChart
        catalog={catalog}
        totalCosts={12000}
        breakEvenUnits={60}
        recommendedUnits={180}
        currency="MXN"
      />,
    )

    expect(container.querySelector('.recharts-wrapper')).not.toBeNull()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Costs (fee + goods)')).toBeInTheDocument()
    expect(screen.getByText('Your fee')).toBeInTheDocument()
    expect(screen.getByText('Break-even: 60 units')).toBeInTheDocument()
    expect(screen.getByText('3× target: 180 units')).toBeInTheDocument()
  })

  it('shows a fallback when an event cannot be profitable', () => {
    render(
      <BreakEvenChart
        catalog={catalog}
        totalCosts={0}
        breakEvenUnits={null}
        recommendedUnits={null}
        currency="MXN"
      />,
    )

    expect(screen.getByText(/Add a positive fee/)).toBeInTheDocument()
  })
})