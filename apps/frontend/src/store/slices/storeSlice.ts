import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Store, StoreSettings } from '@ultimate-pos/shared'

export interface StoreState {
  currentStore: Store | null
  isLoading: boolean
  error: string | null
  settingsLoading: boolean
}

const initialState: StoreState = {
  currentStore: null,
  isLoading: false,
  error: null,
  settingsLoading: false,
}

export const fetchStore = createAsyncThunk('store/fetchStore', async () => {
  const res = await fetch('/api/stores/current')
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to fetch store')
  }
  return res.json()
})

export const updateStoreSettings = createAsyncThunk(
  'store/updateSettings',
  async (newSettings: Partial<StoreSettings & { taxRate?: number }>, { getState }) => {
    const state = getState() as { storeConfig: StoreState }
    const currentSettings = state.storeConfig.currentStore?.settings ?? {}
    const merged = { ...currentSettings, ...newSettings }

    const res = await fetch('/api/stores/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: merged }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to update settings')
    }
    return res.json()
  },
)

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
        if (state.currentStore) {
          state.currentStore = {
            ...action.payload,
            settings: { ...state.currentStore.settings, ...action.payload.settings },
          }
        } else {
          state.currentStore = action.payload
        }
      })
      .addCase(fetchStore.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch store'
      })
      .addCase(updateStoreSettings.pending, (state) => {
        state.settingsLoading = true
      })
      .addCase(updateStoreSettings.fulfilled, (state, action) => {
        state.settingsLoading = false
        if (state.currentStore) {
          state.currentStore.settings = { ...state.currentStore.settings, ...action.payload.settings }
          if (action.payload.tax_rate !== undefined) {
            state.currentStore.tax_rate = action.payload.tax_rate
          }
        }
      })
      .addCase(updateStoreSettings.rejected, (state) => {
        state.settingsLoading = false
      })
  },
})

export const { setStore } = storeSlice.actions
export default storeSlice.reducer
