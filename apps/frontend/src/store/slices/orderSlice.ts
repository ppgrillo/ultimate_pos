'use client'

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Order } from '@ultimate-pos/shared'

export type OrderTab = 'active' | 'completed' | 'all'

interface OrderState {
  items: Order[]
  activeTab: OrderTab
}

const initialState: OrderState = {
  items: [],
  activeTab: 'active',
}

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<OrderTab>) {
      state.activeTab = action.payload
    },
    orderUpdated(state, action: PayloadAction<Order>) {
      const idx = state.items.findIndex((o) => o.id === action.payload.id)
      if (idx >= 0) state.items[idx] = action.payload
      else state.items.unshift(action.payload)
    },
    clearOrders(state) {
      state.items = []
      state.activeTab = 'active'
    },
  },
})

export const { setActiveTab, orderUpdated, clearOrders } = orderSlice.actions
export default orderSlice.reducer
