import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { Product } from '@ultimate-pos/shared'
import { buildCatalog, DEFAULT_PARAMS } from '@/lib/simulaciones/calculations'
import { Throughput } from './Throughput'

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

describe('Throughput', () => {
  it('shows the required pace, the capable pace and the time to goal', () => {
    const { container } = render(
      <Throughput catalog={catalog} params={{ ...DEFAULT_PARAMS, eventCost: 10000 }} currency="MXN" onChange={vi.fn()} />,
    )

    expect(screen.getByText('Can you sell it in time?')).toBeInTheDocument()
    expect(screen.getByLabelText('Event hours')).toHaveValue(8)
    expect(screen.getByLabelText('People serving')).toHaveValue(2)
    expect(screen.getByLabelText('Minutes per sale')).toHaveValue(5)

    expect(screen.getByText('20.4/h')).toBeInTheDocument()
    expect(screen.getAllByText(/143 units/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Your team can keep up')).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).not.toBeNull()
  })

  it('warns when the team cannot reach the goal in time and suggests more people', () => {
    render(
      <Throughput
        catalog={catalog}
        params={{
          ...DEFAULT_PARAMS,
          eventCost: 10000,
          eventDurationHours: 4,
          staffCount: 1,
          serviceMinutesPerUnit: 10,
        }}
        currency="MXN"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Your team is short')).toBeInTheDocument()
    expect(screen.getByText('7 people')).toBeInTheDocument()
  })

  it('lets the user change the goal and the event length', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const onChange = vi.fn()
    render(
      <Throughput catalog={catalog} params={{ ...DEFAULT_PARAMS, eventCost: 10000 }} currency="MXN" onChange={onChange} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '3× target' }))
    expect(onChange).toHaveBeenCalledWith({ goalMode: 'recommended' })

    await userEvent.click(screen.getByRole('button', { name: '4h' }))
    expect(onChange).toHaveBeenCalledWith({ eventDurationHours: 4 })
  })
})
