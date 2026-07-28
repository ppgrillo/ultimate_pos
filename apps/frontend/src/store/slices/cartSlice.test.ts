import cartReducer, { addItem, removeItem, updateQuantity, type CartState } from './cartSlice'

const baseState: CartState = {
  items: [],
  customer_id: null,
  customer_name: null,
  customer_tier: null,
  customer_points: 0,
  customer_loyalty_card_id: null,
  table_number: null,
  order_type: 'dine-in',
  discount: 0,
  notes: null,
  discount_label: null,
  redeemed_points: 0,
  appliedPromotions: [],
  promoDiscount: 0,
}

describe('cartSlice identity', () => {
  it('keeps separate lines when notes differ', () => {
    const state1 = cartReducer(baseState, addItem({
      product_id: 'burger',
      name: 'Burger',
      price: 5,
      original_price: 5,
      quantity: 1,
      variant_label: 'M',
      modifiers: ['M'],
      notes: 'No cheese',
      category_id: null,
    }))

    const state2 = cartReducer(state1, addItem({
      product_id: 'burger',
      name: 'Burger',
      price: 5,
      original_price: 5,
      quantity: 1,
      variant_label: 'M',
      modifiers: ['M'],
      notes: 'Extra onion',
      category_id: null,
    }))

    expect(state2.items).toHaveLength(2)
  })

  it('merges lines when notes/modifiers/product match', () => {
    const state1 = cartReducer(baseState, addItem({
      product_id: 'burger',
      name: 'Burger',
      price: 5,
      original_price: 5,
      quantity: 1,
      variant_label: 'M',
      modifiers: ['M'],
      notes: 'No cheese',
      category_id: null,
    }))

    const state2 = cartReducer(state1, addItem({
      product_id: 'burger',
      name: 'Burger',
      price: 5,
      original_price: 5,
      quantity: 2,
      variant_label: 'M',
      modifiers: ['M'],
      notes: 'No cheese',
      category_id: null,
    }))

    expect(state2.items).toHaveLength(1)
    expect(state2.items[0]?.quantity).toBe(3)
  })

  it('updates and removes item by notes-aware identity', () => {
    const populated = cartReducer(baseState, addItem({
      product_id: 'burger',
      name: 'Burger',
      price: 5,
      original_price: 5,
      quantity: 1,
      variant_label: 'M',
      modifiers: ['M'],
      notes: 'No cheese',
      category_id: null,
    }))

    const updated = cartReducer(populated, updateQuantity({
      product_id: 'burger',
      modifiers: ['M'],
      notes: 'No cheese',
      quantity: 4,
    }))

    expect(updated.items[0]?.quantity).toBe(4)

    const removed = cartReducer(updated, removeItem({
      product_id: 'burger',
      modifiers: ['M'],
      notes: 'No cheese',
    }))

    expect(removed.items).toHaveLength(0)
  })
})
