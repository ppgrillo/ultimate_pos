'use client'

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

type PosView = 'menu' | 'tables' | 'cart' | 'payment' | 'receipt'

export interface PosState {
  activeView: PosView
  selectedCategory: string | null
  searchQuery: string
  cartOpen: boolean
  checkoutView: boolean
  customerDrawerOpen: boolean
  customerBarExpanded: boolean
  customizeProductId: string | null
  customerSelectSkipped: boolean
  scannerOpen: boolean
  kitchenNotice: string | null
  quickSaleOpen: boolean
}

const initialState: PosState = {
  activeView: 'menu',
  selectedCategory: null,
  searchQuery: '',
  cartOpen: false,
  checkoutView: false,
  customerDrawerOpen: false,
  customerBarExpanded: false,
  customizeProductId: null,
  customerSelectSkipped: false,
  scannerOpen: false,
  kitchenNotice: null,
  quickSaleOpen: false,
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
    setCartOpen(state, action: PayloadAction<boolean>) {
      state.cartOpen = action.payload
    },
    setCheckoutView(state, action: PayloadAction<boolean>) {
      state.checkoutView = action.payload
    },
    setCustomerDrawerOpen(state, action: PayloadAction<boolean>) {
      state.customerDrawerOpen = action.payload
    },
    setCustomerBarExpanded(state, action: PayloadAction<boolean>) {
      state.customerBarExpanded = action.payload
    },
    setCustomizeProductId(state, action: PayloadAction<string | null>) {
      state.customizeProductId = action.payload
    },
    setCustomerSelectSkipped(state, action: PayloadAction<boolean>) {
      state.customerSelectSkipped = action.payload
    },
    setScannerOpen(state, action: PayloadAction<boolean>) {
      state.scannerOpen = action.payload
    },
    setKitchenNotice(state, action: PayloadAction<string | null>) {
      state.kitchenNotice = action.payload
    },
    setQuickSaleOpen(state, action: PayloadAction<boolean>) {
      state.quickSaleOpen = action.payload
    },
  },
})

export const {
  setActiveView, setSelectedCategory, setSearchQuery,
  setCartOpen, setCheckoutView, setCustomerDrawerOpen,
  setCustomerBarExpanded, setCustomizeProductId,
  setCustomerSelectSkipped, setScannerOpen, setKitchenNotice,
  setQuickSaleOpen,
} = posSlice.actions
export default posSlice.reducer
