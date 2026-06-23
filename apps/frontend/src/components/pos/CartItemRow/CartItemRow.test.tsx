import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CartItemRow } from './CartItemRow'
import type { CartItem } from '@/store/slices/cartSlice'

const item: CartItem = {
  product_id: 'p1',
  name: 'Latte',
  price: 5.0,
  quantity: 2,
  variant_label: 'Oat Milk',
  modifiers: ['Oat Milk'],
  notes: null,
}

const productWithImage = {
  id: 'p1',
  name: 'Latte',
  price: 5,
  is_active: true,
  store_id: 's1',
  category_id: null,
  image_url: '/latte.jpg',
  created_at: '',
  updated_at: '',
  description: null,
  sku: null,
  barcode: null,
  cost: null,
  modifiers: [],
  points: null,
  stock_qty: null,
  track_inventory: false,
  low_stock_threshold: null,
  tax_exempt: false,
}

describe('CartItemRow', () => {
  it('renders item name, variant, and price', () => {
    render(<CartItemRow item={item} />, {
      preloadedState: {
        products: { items: [productWithImage], categories: [] },
      },
    })
    expect(screen.getByText('Latte')).toBeInTheDocument()
    expect(screen.getByText('Oat Milk')).toBeInTheDocument()
    expect(screen.getByText('$5.00')).toBeInTheDocument()
  })

  it('renders a product thumbnail when available', () => {
    render(<CartItemRow item={item} />, {
      preloadedState: {
        products: { items: [productWithImage], categories: [] },
      },
    })
    expect(screen.getByAltText('Latte')).toHaveAttribute('src', '/latte.jpg')
  })

  it('shows quantity when not editable', () => {
    render(<CartItemRow item={item} editable={false} />)
    expect(screen.getByText('x2')).toBeInTheDocument()
  })

  it('renders QuantityStepper when editable', () => {
    render(<CartItemRow item={item} editable={true} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('dispatches removeItem when quantity reaches 0', async () => {
    render(
      <CartItemRow item={{ ...item, quantity: 1 }} />,
      {
        preloadedState: {
          cart: {
            items: [{ ...item, quantity: 1 }],
            customer_id: null,
            customer_name: null,
            customer_tier: null,
            table_number: null,
            order_type: 'dine-in',
            discount: 0,
            notes: null,
            discount_label: null,
          },
        },
      },
    )
    const minusBtn = screen.getAllByRole('button')[0]
    await userEvent.click(minusBtn)
  })
})
