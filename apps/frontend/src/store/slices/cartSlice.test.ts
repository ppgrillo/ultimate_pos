import cartReducer, { addItem, removeItem, updateQuantity, setAutoPromotions, type CartState } from './cartSlice'

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
  redeemed_reward_id: null,
  redeemed_reward_data: null,
  autoPromotions: true,
  tip: 0,
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

describe('cartSlice autoPromotions', () => {
  it('starts enabled by default', () => {
    expect(baseState.autoPromotions).toBe(true)
  })

  it('restores full prices when auto promotions are paused', () => {
    const withPromo = cartReducer(baseState, addItem({
      product_id: 'soda',
      name: 'Soda',
      price: 4,
      original_price: 5,
      quantity: 2,
      variant_label: '',
      modifiers: [],
      notes: null,
      category_id: null,
    }))

    const paused = cartReducer(withPromo, setAutoPromotions(false))
    expect(paused.autoPromotions).toBe(false)
    expect(paused.items[0]?.price).toBe(5)
  })

  it('clears applied promotions when paused', () => {
    const withPromos: CartState = {
      ...baseState,
      appliedPromotions: [{ promotion_id: 'p1', name: 'Combo', discount_amount: 2 }],
      promoDiscount: 2,
    }
    const paused = cartReducer(withPromos, setAutoPromotions(false))
    expect(paused.appliedPromotions).toHaveLength(0)
    expect(paused.promoDiscount).toBe(0)
  })

  it('keeps items untouched when re-enabled', () => {
    const state1 = cartReducer(baseState, addItem({
      product_id: 'soda',
      name: 'Soda',
      price: 4,
      original_price: 5,
      quantity: 2,
      variant_label: '',
      modifiers: [],
      notes: null,
      category_id: null,
    }))
    const paused = cartReducer(state1, setAutoPromotions(false))
    const reEnabled = cartReducer(paused, setAutoPromotions(true))
    expect(reEnabled.autoPromotions).toBe(true)
    expect(reEnabled.items[0]?.price).toBe(5)
  })

  it('resets to enabled on clearCart', () => {
    const paused = cartReducer({ ...baseState, autoPromotions: false }, setAutoPromotions(false))
    const cleared = cartReducer(paused, { type: 'cart/clearCart' })
    expect((cleared as CartState).autoPromotions).toBe(true)
  })
})

describe('cartSlice bulk quantities', () => {
  const bulkItem = (quantity: number) => ({
    product_id: 'apples',
    name: 'Apples',
    price: 2.5,
    original_price: 2.5,
    quantity,
    variant_label: '',
    modifiers: [],
    notes: null,
    category_id: null,
    is_bulk: true,
    bulk_unit: 'kg',
    bulk_step: 0.5,
  })

  it('merges fractional bulk lines by summing quantities', () => {
    const state1 = cartReducer(baseState, addItem(bulkItem(0.5)))
    const state2 = cartReducer(state1, addItem(bulkItem(1)))
    expect(state2.items).toHaveLength(1)
    expect(state2.items[0]?.quantity).toBe(1.5)
  })

  it('updates a bulk line to a fractional quantity', () => {
    const populated = cartReducer(baseState, addItem(bulkItem(1)))
    const updated = cartReducer(populated, updateQuantity({
      product_id: 'apples',
      modifiers: [],
      notes: null,
      quantity: 2.25,
    }))
    expect(updated.items[0]?.quantity).toBe(2.25)
  })

  it('rounds accumulated float drift when merging bulk lines', () => {
    const state1 = cartReducer(baseState, addItem(bulkItem(0.1)))
    const state2 = cartReducer(state1, addItem(bulkItem(0.2)))
    expect(state2.items[0]?.quantity).toBe(0.3)
    expect(state2.items[0]?.quantity).not.toBe(0.1 + 0.2)
  })

  it('rounds the merged total to 3 decimals across repeated adds', () => {
    let state = cartReducer(baseState, addItem(bulkItem(0.1)))
    state = cartReducer(state, addItem(bulkItem(0.7)))
    expect(state.items[0]?.quantity).toBe(0.8)
  })

  it('rounds a float-drifted updateQuantity to 3 decimals', () => {
    const populated = cartReducer(baseState, addItem(bulkItem(1)))
    const updated = cartReducer(populated, updateQuantity({
      product_id: 'apples',
      modifiers: [],
      notes: null,
      quantity: 0.1 + 0.2,
    }))
    expect(updated.items[0]?.quantity).toBe(0.3)
  })
})
