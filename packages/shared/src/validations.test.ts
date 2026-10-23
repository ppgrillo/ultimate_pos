import { describe, it, expect } from 'vitest'
import { productSchema, orderSchema, addCheckOrderSchema } from './validations'

const baseProduct = { name: 'Apples', price: 2.5 }

describe('productSchema bulk fields', () => {
  it('defaults is_bulk to false', () => {
    const parsed = productSchema.parse(baseProduct)
    expect(parsed.is_bulk).toBe(false)
  })

  it('accepts a bulk product with unit and step', () => {
    const parsed = productSchema.parse({
      ...baseProduct,
      is_bulk: true,
      bulk_unit: 'kg',
      bulk_step: 0.1,
    })
    expect(parsed.is_bulk).toBe(true)
    expect(parsed.bulk_unit).toBe('kg')
    expect(parsed.bulk_step).toBe(0.1)
  })

  it('allows a fractional stock quantity', () => {
    const parsed = productSchema.parse({ ...baseProduct, stock_qty: 1.5 })
    expect(parsed.stock_qty).toBe(1.5)
  })

  it('rejects a non-positive bulk_step', () => {
    expect(productSchema.safeParse({ ...baseProduct, bulk_step: 0 }).success).toBe(false)
    expect(productSchema.safeParse({ ...baseProduct, bulk_step: -0.5 }).success).toBe(false)
  })

  it('rejects a bulk_unit longer than 16 chars', () => {
    expect(productSchema.safeParse({ ...baseProduct, bulk_unit: 'a'.repeat(17) }).success).toBe(false)
  })

  it('rejects a blank bulk_unit when provided', () => {
    expect(productSchema.safeParse({ ...baseProduct, bulk_unit: '   ' }).success).toBe(false)
  })
})

describe('orderSchema fractional quantities', () => {
  const order = (quantity: number) => ({
    items: [{ product_id: '11111111-1111-1111-1111-111111111111', quantity }],
  })

  it('accepts a fractional (bulk) quantity', () => {
    const parsed = orderSchema.parse(order(1.5))
    expect(parsed.items[0]?.quantity).toBe(1.5)
  })

  it('rejects a zero quantity', () => {
    expect(orderSchema.safeParse(order(0)).success).toBe(false)
  })

  it('rejects a negative quantity', () => {
    expect(orderSchema.safeParse(order(-1)).success).toBe(false)
  })

  it('rejects a quantity above the cap', () => {
    expect(orderSchema.safeParse(order(100001)).success).toBe(false)
  })
})

describe('addCheckOrderSchema fractional quantities', () => {
  it('accepts a fractional quantity', () => {
    const parsed = addCheckOrderSchema.parse({
      items: [{ product_id: null, quantity: 0.25 }],
    })
    expect(parsed.items[0]?.quantity).toBe(0.25)
  })
})
