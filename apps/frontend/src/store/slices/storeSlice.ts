import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Store } from '@ultimate-pos/shared'

export interface StoreState {
  currentStore: Store | null
  isLoading: boolean
  error: string | null
}

const initialState: StoreState = {
  currentStore: null,
  isLoading: false,
  error: null,
}

export const fetchStore = createAsyncThunk('store/fetchStore', async () => {
  const res = await fetch('/api/stores/current')
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch store')
  }
  return res.json()
})

const storeSlice = createSlice({
  name: 'storeConfig',
  initialState,
  reducers: {
    setStore(state, action: PayloadAction<Store | null>) {
      state.currentStore = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStore.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchStore.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentStore = action.payload
      })
      .addCase(fetchStore.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch store'
      })
  },
})

export const { setStore } = storeSlice.actions
export default storeSlice.reducer
