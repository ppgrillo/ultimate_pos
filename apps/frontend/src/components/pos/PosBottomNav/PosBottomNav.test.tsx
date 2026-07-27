import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { PosBottomNav } from './PosBottomNav'

describe('PosBottomNav', () => {
  it('renders all 4 nav tabs', () => {
    render(<PosBottomNav enableTablesTab />, {
      preloadedState: {
        storeConfig: {
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
            settings: { hasKitchen: true },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      },
    })
    expect(screen.getByText('Menu')).toBeInTheDocument()
    expect(screen.getByText('Mesas')).toBeInTheDocument()
    expect(screen.getByText('Carrito')).toBeInTheDocument()
    expect(screen.getByText('Escanear')).toBeInTheDocument()
    expect(screen.getByText('Clientes')).toBeInTheDocument()
  })

  it('highlights menu as active by default', () => {
    render(<PosBottomNav />)
    const menu = screen.getByText('Menu')
    expect(menu.closest('button')).toHaveClass('text-primary')
  })

  it('opens customer drawer when clientes tab is clicked', async () => {
    render(<PosBottomNav />)
    await userEvent.click(screen.getByText('Clientes'))
  })
})
