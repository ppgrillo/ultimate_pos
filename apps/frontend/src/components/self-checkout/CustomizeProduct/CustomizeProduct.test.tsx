import { render, screen, fireEvent } from '@/test/test-utils'
import { CustomizeProduct } from './CustomizeProduct'
import type { ComponentProps } from 'react'
import type { Product, Promotion } from '@ultimate-pos/shared'

const product: Product = {
  id: 'p1',
  name: 'Cappuccino',
  price: 4.5,
  description: 'Rich espresso with steamed milk',
  is_active: true,
  store_id: 's1',
  category_id: 'cat-1',
  modifiers: [
    {
      name: 'Milk Choice',
      type: 'single',
      is_required: true,
      sort_order: 0,
      options: [
        { name: 'Whole Milk', price_adjustment: 0, sort_order: 0 },
        { name: 'Oat Milk', price_adjustment: 0.5, sort_order: 1 },
      ],
    },
  ],
  created_at: '',
  updated_at: '',
}

const promotion: Promotion = {
  id: 'promo-1',
  name: 'Happy Hour',
  is_active: true,
  target_type: 'product',
  target_ids: ['p1'],
  discount_type: 'percentage',
  discount_value: 10,
}

function renderModal(overrides: Partial<ComponentProps<typeof CustomizeProduct>> = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <CustomizeProduct
      product={product}
      promotion={null}
      specialInstructionsEnabled
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />,
  )
  return { onConfirm, onClose }
}

describe('SelfCheckout CustomizeProduct', () => {
  it('renders product name, price and points', () => {
    renderModal({ product: { ...product, points: 5 } })
    expect(screen.getByText('Cappuccino')).toBeInTheDocument()
    expect(screen.getAllByText('$4.50').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('+5 pts')).toBeInTheDocument()
  })

  it('renders modifier group, options and required badge', () => {
    renderModal()
    expect(screen.getByText('Milk Choice')).toBeInTheDocument()
    expect(screen.getByText('Whole Milk')).toBeInTheDocument()
    expect(screen.getByText('Oat Milk')).toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('+$0.50')).toBeInTheDocument()
  })

  it('preselects the first option of a required single group', () => {
    renderModal()
    const wholeMilk = screen.getByRole('button', { name: /Whole Milk/ })
    expect(wholeMilk.className).toContain('bg-primary/10')
  })

  it('applies promotion price to the base price', () => {
    renderModal({ promotion })
    expect(screen.getAllByText('$4.05').length).toBeGreaterThanOrEqual(1)
  })

  it('computes item total including selected paid modifier', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Oat Milk/ }))
    expect(screen.getByText('$5.00')).toBeInTheDocument()
  })

  it('hides special instructions when disabled', () => {
    renderModal({ specialInstructionsEnabled: false })
    expect(screen.queryByText('Special Instructions')).not.toBeInTheDocument()
  })

  it('confirms with modifiers, variant label and quantity', () => {
    const { onConfirm } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /Oat Milk/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    fireEvent.change(screen.getByPlaceholderText('Any special requests?'), {
      target: { value: 'No foam' },
    })
    fireEvent.click(screen.getByText('Add to Cart'))
    expect(onConfirm).toHaveBeenCalledWith({
      quantity: 2,
      modifiers: ['Oat Milk'],
      variant_label: 'Oat Milk',
      notes: 'No foam',
      price: 5,
      original_price: 5,
    })
  })

  it('calls onClose on Discard', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByText('Discard'))
    expect(onClose).toHaveBeenCalled()
  })
})
