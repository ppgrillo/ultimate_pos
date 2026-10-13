import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { MetricGlossary } from './MetricGlossary'
import type { AnalyticsOverview } from '@/store/api'

const overview: AnalyticsOverview = {
  revenue: 67552,
  revenueChange: null,
  orderCount: 124,
  orderChange: null,
  avgOrderValue: 544.77,
  avgChange: null,
  newCustomers: 14,
  grossSales: 70350,
  discounts: 2798,
  taxCollected: 1200,
  itemsSold: 187,
  cogs: 12000,
  grossProfit: 55552,
  operatingExpenses: 3200,
  inventoryPurchases: 5000,
  netProfit: 52352,
  ordersByType: {},
  ordersByPayment: {},
  revenueByPayment: {},
  paymentStatusBreakdown: {},
}

describe('MetricGlossary', () => {
  it('renders nothing when overview is unavailable', () => {
    const { container } = render(<MetricGlossary overview={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders every term with its value, formula and description', () => {
    render(<MetricGlossary overview={overview} />)
    expect(screen.getByText('Metric definitions')).toBeInTheDocument()

    for (const name of ['Revenue', 'Gross Sales', 'Discounts', 'Tax', 'Items Sold', 'Gross Profit', 'Operating Expenses', 'Inventory Purchases', 'Net Profit', 'Avg Ticket']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getAllByText('COGS').length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText('Σ orders.total')).toBeInTheDocument()
    expect(screen.getByText('Revenue − COGS')).toBeInTheDocument()
    expect(screen.getByText('Gross Profit − Operating Expenses')).toBeInTheDocument()
    expect(screen.getByText(/after all discounts/)).toBeInTheDocument()
    expect(screen.getAllByText(/inventory purchases/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/converts cash into inventory/)).toBeInTheDocument()
  })

  it('shows the live numbers used in each derived formula', () => {
    render(<MetricGlossary overview={overview} />)
    expect(screen.getByText('Your values: $67,552.00 − $12,000.00')).toBeInTheDocument()
    expect(screen.getByText('Your values: $55,552.00 − $3,200.00')).toBeInTheDocument()
    expect(screen.getByText('Your values: $67,552.00 ÷ 124 orders')).toBeInTheDocument()
    expect(screen.getByText('Your values: 187 units × product cost')).toBeInTheDocument()
  })

  it('expands and collapses when the header is toggled', async () => {
    const { container } = render(<MetricGlossary overview={overview} />)
    const content = container.querySelector('[class*="grid-rows-"]') as HTMLElement
    expect(content).toHaveClass('opacity-0')

    await userEvent.click(screen.getByRole('button', { name: /metric definitions/i }))
    expect(content).toHaveClass('opacity-100')
  })

  it('shows the inclusive reconciliation formula when tax is included in prices', () => {
    render(<MetricGlossary overview={overview} taxInclusive />)
    expect(screen.getByText('Revenue = Gross Sales − Discounts')).toBeInTheDocument()
    expect(screen.getByText('Your values: $67,552.00 = $70,350.00 − $2,798.00')).toBeInTheDocument()
  })

  it('shows the exclusive reconciliation formula when tax is added on top', () => {
    render(<MetricGlossary overview={overview} taxInclusive={false} />)
    expect(screen.getByText('Revenue = Gross Sales + Tax − Discounts')).toBeInTheDocument()
    expect(screen.getByText('Your values: $67,552.00 = $70,350.00 + $1,200.00 − $2,798.00')).toBeInTheDocument()
  })

  it('uses the store tax label for the tax term', () => {
    render(<MetricGlossary overview={overview} taxLabel="IVA" />)
    expect(screen.getByText('IVA')).toBeInTheDocument()
    expect(screen.queryByText('Tax')).not.toBeInTheDocument()
  })
})
