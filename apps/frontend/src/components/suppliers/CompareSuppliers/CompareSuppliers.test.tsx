import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CompareSuppliers } from './CompareSuppliers'
import type { SupplierWithStats } from '@ultimate-pos/shared'

const S1: SupplierWithStats = {
  id: 's1',
  store_id: 'store-1',
  name: 'Distribuidora Norte',
  contact_name: 'Ana Torres',
  phone: '+52 555 123 4567',
  email: 'ventas@distnorte.mx',
  website: 'https://distnorte.mx',
  address: null,
  notes: 'Textiles y uniformes',
  is_active: true,
  created_at: '',
  updated_at: '',
  stats: {
    totalSpent: 2000,
    purchaseCount: 3,
    avgExpense: 666.67,
    lastPurchaseDate: '2026-08-20',
    avgDeliveryDays: 4,
  },
}

const S2: SupplierWithStats = {
  id: 's2',
  store_id: 'store-1',
  name: 'Papelera Central',
  contact_name: null,
  phone: null,
  email: null,
  website: null,
  address: 'Av. Central 2',
  notes: 'Papelería y etiquetas',
  is_active: true,
  created_at: '',
  updated_at: '',
  stats: {
    totalSpent: 900,
    purchaseCount: 2,
    avgExpense: 450,
    lastPurchaseDate: '2026-08-01',
    avgDeliveryDays: 2,
  },
}

const onOpenChange = vi.fn()
const onViewPurchases = vi.fn()

function renderCompare(open = true) {
  return render(
    <CompareSuppliers
      open={open}
      onOpenChange={onOpenChange}
      suppliers={[S1, S2]}
      onViewPurchases={onViewPurchases}
    />,
  )
}

describe('CompareSuppliers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders supplier columns and metric rows', () => {
    renderCompare()
    expect(screen.getByText('Compare Suppliers')).toBeInTheDocument()
    expect(screen.getByText('Distribuidora Norte')).toBeInTheDocument()
    expect(screen.getByText('Papelera Central')).toBeInTheDocument()
    for (const label of ['Total spent', 'Purchases', 'Avg expense', 'Last purchase', 'Avg delivery']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('marks the best value per metric (max spend, min delivery)', () => {
    renderCompare()
    const bestBadges = screen.getAllByText('Best')
    // Total spent (S1 wins), Purchases (S1 wins), Last purchase (S1 wins)
    // Avg expense (S2 wins), Avg delivery (S2 wins) → 5 badges in metrics rows
    expect(bestBadges).toHaveLength(5)
  })

  it('shows detail rows including What they supply', () => {
    renderCompare()
    expect(screen.getByText('What they supply')).toBeInTheDocument()
    expect(screen.getByText('Textiles y uniformes')).toBeInTheDocument()
    expect(screen.getByText('Papelería y etiquetas')).toBeInTheDocument()
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
  })

  it('opens the purchases view when clicking a supplier action', async () => {
    const user = userEvent.setup()
    renderCompare()
    const buttons = screen.getAllByText('View purchases')
    await user.click(buttons[0])
    expect(onViewPurchases).toHaveBeenCalledWith(S1)
  })
})