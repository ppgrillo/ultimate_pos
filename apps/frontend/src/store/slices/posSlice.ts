import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type PosView = 'menu' | 'cart' | 'payment' | 'receipt'

export interface PosState {
  activeView: PosView
  selectedCategory: string | null
  searchQuery: string
}

const initialState: PosState = {
  activeView: 'menu',
  selectedCategory: null,
  searchQuery: '',
}

const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    setActiveView(state, action: PayloadAction<PosView>) {
      state.activeView = action.payload
    },
    setSelectedCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategory = action.payload
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload
    },
  },
})

export const { setActiveView, setSelectedCategory, setSearchQuery } = posSlice.actions
export default posSlice.reducer
