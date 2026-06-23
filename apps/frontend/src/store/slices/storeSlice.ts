import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Store } from '@ultimate-pos/shared'

export interface StoreState {
  currentStore: Store | null
}

const initialState: StoreState = {
  currentStore: null,
}

const storeSlice = createSlice({
  name: 'storeConfig',
  initialState,
  reducers: {
    setStore(state, action: PayloadAction<Store | null>) {
      state.currentStore = action.payload
    },
  },
})

export const { setStore } = storeSlice.actions
export default storeSlice.reducer
