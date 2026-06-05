import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  modifiers: string[]
  notes: string | null
}

export interface CartState {
  items: CartItem[]
  customer_id: string | null
  table_number: string | null
  notes: string | null
}

const initialState: CartState = {
  items: [],
  customer_id: null,
  table_number: null,
  notes: null,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        (item) =>
          item.product_id === action.payload.product_id &&
          JSON.stringify(item.modifiers) === JSON.stringify(action.payload.modifiers),
      )

      if (existing) {
        existing.quantity += action.payload.quantity
      } else {
        state.items.push(action.payload)
      }
    },
    removeItem(state, action: PayloadAction<{ product_id: string; modifiers: string[] }>) {
      state.items = state.items.filter(
        (item) =>
          !(item.product_id === action.payload.product_id &&
            JSON.stringify(item.modifiers) === JSON.stringify(action.payload.modifiers)),
      )
    },
    updateQuantity(
      state,
      action: PayloadAction<{ product_id: string; modifiers: string[]; quantity: number }>,
    ) {
      const item = state.items.find(
        (item) =>
          item.product_id === action.payload.product_id &&
          JSON.stringify(item.modifiers) === JSON.stringify(action.payload.modifiers),
      )
      if (item) {
        item.quantity = Math.max(0, action.payload.quantity)
      }
    },
    setCustomer(state, action: PayloadAction<string | null>) {
      state.customer_id = action.payload
    },
    setTable(state, action: PayloadAction<string | null>) {
      state.table_number = action.payload
    },
    setNotes(state, action: PayloadAction<string | null>) {
      state.notes = action.payload
    },
    clearCart() {
      return initialState
    },
  },
})

export const { addItem, removeItem, updateQuantity, setCustomer, setTable, setNotes, clearCart } =
  cartSlice.actions

export default cartSlice.reducer
