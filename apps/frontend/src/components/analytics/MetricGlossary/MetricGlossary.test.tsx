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
  netProfit: 55552,
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

    for (const name of ['Revenue', 'Gross Sales', 'Discounts', 'Tax', 'Items Sold', 'COGS', 'Gross Profit', 'Net Profit', 'Avg Ticket']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }

    expect(screen.getByText('Σ orders.total')).toBeInTheDocument()
    expect(screen.getByText('Revenue − COGS')).toBeInTheDocument()
    expect(screen.getByText('Gross Profit − expenses')).toBeInTheDocument()
    expect(screen.getByText(/after all discounts/)).toBeInTheDocument()
    expect(screen.getByText(/Operating expenses are not tracked yet/)).toBeInTheDocument()
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
  })

  it('shows the exclusive reconciliation formula when tax is added on top', () => {
    render(<MetricGlossary overview={overview} taxInclusive={false} />)
    expect(screen.getByText('Revenue = Gross Sales + Tax − Discounts')).toBeInTheDocument()
  })

  it('uses the store tax label for the tax term', () => {
    render(<MetricGlossary overview={overview} taxLabel="IVA" />)
    expect(screen.getByText('IVA')).toBeInTheDocument()
    expect(screen.queryByText('Tax')).not.toBeInTheDocument()
  })
})
