import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Store } from '@ultimate-pos/shared'

/**
 * Lifecycle of the `GET /stores/current` request.
 *
 * `currentStore === null` alone is ambiguous: it looks the same while the request
 * is still in flight and after it failed. Checkout used to default `checkoutMode`
 * to 'order-only' in both cases, which hid the payment method selector and made
 * the backend reject the order with "Payment method is required". The status lets
 * consumers tell the two apart and block the action instead of guessing.
 */
export type StoreLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface StoreState {
  currentStore: Store | null
  status: StoreLoadStatus
}

const initialState: StoreState = {
  currentStore: null,
  status: 'idle',
}

const storeSlice = createSlice({
  name: 'storeConfig',
  initialState,
  reducers: {
    setStore(state, action: PayloadAction<Store | null>) {
      state.currentStore = action.payload
      if (action.payload) state.status = 'ready'
    },
    setStoreStatus(state, action: PayloadAction<StoreLoadStatus>) {
      state.status = action.payload
      // A failed or in-flight load must not leave a stale store behind acting as
      // if it were authoritative.
      if (action.payload !== 'ready') state.currentStore = null
    },
  },
})

export const { setStore, setStoreStatus } = storeSlice.actions
export default storeSlice.reducer
