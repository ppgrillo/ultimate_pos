'use client'

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppliedPromotion } from '@ultimate-pos/shared'

export interface CartItem {
  product_id: string | null
  name: string
  price: number
  original_price: number
  quantity: number
  variant_label: string
  modifiers: string[]
  notes: string | null
  category_id?: string | null
  is_custom?: boolean
  points?: number
}

function normalizeNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const value = notes.trim()
  return value.length > 0 ? value : null
}

function isSameCartLine(a: CartItem, b: Pick<CartItem, 'product_id' | 'modifiers' | 'notes'> & { is_custom?: boolean; name?: string }): boolean {
  if (a.is_custom && b.is_custom) {
    return a.name === (b.name ?? a.name)
  }
  return (
    a.product_id === b.product_id
    && JSON.stringify(a.modifiers) === JSON.stringify(b.modifiers)
    && normalizeNotes(a.notes) === normalizeNotes(b.notes)
  )
}

export interface CartState {
  items: CartItem[]
  customer_id: string | null
  customer_name: string | null
  customer_tier: string | null
  customer_points: number
  customer_loyalty_card_id: string | null
  table_number: number | null
  order_type: 'dine-in' | 'takeaway' | 'delivery'
  discount: number
  notes: string | null
  discount_label: string | null
  redeemed_points: number
  appliedPromotions: AppliedPromotion[]
  promoDiscount: number
  redeemed_reward_id: string | null
  redeemed_reward_data: {
    name: string
    reward_type: string
    points_required: number
    discount_value?: number
    discount_type?: 'percentage' | 'fixed' | null
    product_id?: string
  } | null
}

const initialState: CartState = {
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
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearAutoPromotions(state) {
      state.appliedPromotions = []
      state.promoDiscount = 0
    },
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((item) => isSameCartLine(item, action.payload))
      if (existing) {
        existing.quantity += action.payload.quantity
      } else {
        state.items.push({
          ...action.payload,
          notes: normalizeNotes(action.payload.notes),
        })
      }
      state.appliedPromotions = []
      state.promoDiscount = 0
    },
    removeItem(state, action: PayloadAction<{ product_id: string | null; modifiers: string[]; notes: string | null; is_custom?: boolean; name?: string }>) {
      state.items = state.items.filter(
        (item) => !isSameCartLine(item, action.payload),
      )
      state.appliedPromotions = []
      state.promoDiscount = 0
    },
    updateQuantity(state, action: PayloadAction<{ product_id: string | null; modifiers: string[]; notes: string | null; quantity: number; is_custom?: boolean; name?: string }>) {
      const item = state.items.find((entry) => isSameCartLine(entry, action.payload))
      if (item) {
        item.quantity = Math.max(0, action.payload.quantity)
        state.appliedPromotions = []
        state.promoDiscount = 0
      }
    },
    setCustomer(state, action: PayloadAction<{ id: string; name: string; tier?: string; points?: number; loyalty_card_id?: string } | null>) {
      if (action.payload) {
        state.customer_id = action.payload.id
        state.customer_name = action.payload.name
        state.customer_tier = action.payload.tier || null
        state.customer_points = action.payload.points ?? 0
        state.customer_loyalty_card_id = action.payload.loyalty_card_id ?? null
        state.redeemed_points = 0
        state.redeemed_reward_id = null
        state.redeemed_reward_data = null
        state.items = state.items.filter(
          (item) => !item.notes?.includes('[Reward]'),
        )
      } else {
        state.customer_id = null
        state.customer_name = null
        state.customer_tier = null
        state.customer_points = 0
        state.customer_loyalty_card_id = null
        state.redeemed_points = 0
        state.redeemed_reward_id = null
        state.redeemed_reward_data = null
        state.items = state.items.filter(
          (item) => !item.notes?.includes('[Reward]'),
        )
      }
    },
    setRedeemedPoints(state, action: PayloadAction<number>) {
      state.redeemed_points = Math.min(Math.max(0, action.payload), state.customer_points)
    },
    setRedeemedReward(state, action: PayloadAction<{
      id: string
      name: string
      reward_type: string
      points_required: number
      discount_value?: number
      discount_type?: 'percentage' | 'fixed' | null
      product_id?: string
    } | null>) {
      if (action.payload) {
        state.redeemed_reward_id = action.payload.id
        state.redeemed_reward_data = {
          name: action.payload.name,
          reward_type: action.payload.reward_type,
          points_required: action.payload.points_required,
          discount_value: action.payload.discount_value,
          discount_type: action.payload.discount_type,
          product_id: action.payload.product_id,
        }
      } else {
        state.redeemed_reward_id = null
        state.redeemed_reward_data = null
      }
    },
    setOrderType(state, action: PayloadAction<'dine-in' | 'takeaway' | 'delivery'>) {
      state.order_type = action.payload
    },
    setTable(state, action: PayloadAction<number | null>) {
      state.table_number = action.payload
    },
    setDiscount(state, action: PayloadAction<{ amount: number; label?: string }>) {
      state.discount = action.payload.amount
      state.discount_label = action.payload.label || null
    },
    setNotes(state, action: PayloadAction<string | null>) {
      state.notes = action.payload
    },
    setAppliedPromotions(state, action: PayloadAction<{ promotions: AppliedPromotion[]; totalDiscount: number }>) {
      state.appliedPromotions = action.payload.promotions
      state.promoDiscount = action.payload.totalDiscount
    },
    clearCart() {
      return initialState
    },
    clearRewardItems(state) {
      state.items = state.items.filter(
        (item) => !item.notes?.includes('[Reward]'),
      )
      state.appliedPromotions = []
      state.promoDiscount = 0
    },
  },
})

export const {
  addItem, removeItem, updateQuantity,
  setCustomer, setOrderType, setTable,
  setDiscount, setNotes, clearCart,
  setRedeemedPoints, setAppliedPromotions, clearAutoPromotions,
  setRedeemedReward, clearRewardItems,
} = cartSlice.actions
export default cartSlice.reducer
