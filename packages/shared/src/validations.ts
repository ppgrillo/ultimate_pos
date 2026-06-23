import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  store_name: z.string().min(2).optional(),
})

const modifierOptionSchema = z.object({
  name: z.string().min(1),
  price_adjustment: z.number().min(0).default(0),
  sort_order: z.number().int().min(0).default(0),
})

const modifierGroupSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['single', 'multi']).default('single'),
  is_required: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  options: z.array(modifierOptionSchema).default([]),
})

export const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  cost: z.number().positive().nullable().optional(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  modifiers: z.array(modifierGroupSchema).optional().default([]),
  points: z.number().int().min(0).nullable().optional(),
  stock_qty: z.number().int().min(0).nullable().optional(),
  track_inventory: z.boolean().optional().default(false),
  low_stock_threshold: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional().default(true),
  tax_exempt: z.boolean().optional().default(false),
})

export const orderSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  table_number: z.number().int().nullable().optional(),
  type: z.enum(['dine-in', 'takeaway', 'delivery']).default('dine-in'),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
    unit_price: z.number().min(0).optional(),
    modifiers: z.array(z.string()).optional().default([]),
    notes: z.string().nullable().optional(),
  })).min(1),
  discount: z.number().min(0).optional().default(0),
  discount_label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  payment_method: z.enum(['cash', 'card', 'transfer']).optional(),
  cash_amount_given: z.number().min(0).optional(),
})

export const employeeInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
})

export const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  preferences: z.record(z.unknown()).optional().default({}),
  birthday: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  social_handles: z.record(z.string()).optional().default({}),
  preferred_contact: z.string().nullable().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ProductInput = z.infer<typeof productSchema>
export type OrderInput = z.infer<typeof orderSchema>
export type EmployeeInviteInput = z.infer<typeof employeeInviteSchema>
export type CustomerInput = z.infer<typeof customerSchema>

export type ModifierGroupInput = z.infer<typeof modifierGroupSchema>
export type ModifierOptionInput = z.infer<typeof modifierOptionSchema>
