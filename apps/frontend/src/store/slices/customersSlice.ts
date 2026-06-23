'use client'

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Customer } from '@ultimate-pos/shared'

export interface CustomerWithLoyalty extends Customer {
  loyalty?: {
    tier?: string
    points?: number
  }
}

const customersSlice = createSlice({
  name: 'customers',
  initialState: {
    selectedCustomer: null as CustomerWithLoyalty | null,
  },
  reducers: {
    setSelectedCustomer(state, action: PayloadAction<CustomerWithLoyalty | null>) {
      state.selectedCustomer = action.payload
    },
    clearSelectedCustomer(state) {
      state.selectedCustomer = null
    },
  },
})

export const { setSelectedCustomer, clearSelectedCustomer } = customersSlice.actions
export default customersSlice.reducer
