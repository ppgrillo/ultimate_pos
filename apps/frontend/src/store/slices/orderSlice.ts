'use client'

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api/client'
import type { Order } from '@ultimate-pos/shared'

export type OrderTab = 'active' | 'completed' | 'all'

interface OrderState {
  items: Order[]
  loading: boolean
  error: string | null
  activeTab: OrderTab
}

const initialState: OrderState = {
  items: [],
  loading: false,
  error: null,
  activeTab: 'active',
}

export const fetchOrders = createAsyncThunk('orders/fetchOrders', async (tab?: OrderTab) => {
  const params = tab ? `?tab=${tab}` : ''
  const res = await api.get<{ data: Order[] }>(`/orders${params}`)
  return { data: res.data, tab }
})

export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ id, status }: { id: string; status: string }) => {
    const res = await api.patch<{ data: Order }>(`/orders/${id}/status`, { status })
    return res.data
  }
)

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setActiveTab(state, action: { payload: OrderTab }) {
      state.activeTab = action.payload
    },
    orderUpdated(state, action: { payload: Order }) {
      const idx = state.items.findIndex((o) => o.id === action.payload.id)
      if (idx >= 0) {
        state.items[idx] = action.payload
      } else {
        state.items.unshift(action.payload)
      }
    },
    clearOrders(state) {
      state.items = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.data
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch orders'
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const idx = state.items.findIndex((o) => o.id === action.payload.id)
        if (idx >= 0) state.items[idx] = action.payload
      })
  },
})

export const { setActiveTab, orderUpdated, clearOrders } = orderSlice.actions
export default orderSlice.reducer
