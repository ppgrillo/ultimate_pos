'use client'

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/lib/api/client'
import type { Customer, LoyaltyCard } from '@ultimate-pos/shared'

interface CustomerWithLoyalty extends Customer {
  loyalty?: LoyaltyCard
}

interface CustomersState {
  customers: CustomerWithLoyalty[]
  selectedCustomer: CustomerWithLoyalty | null
  isLoading: boolean
  error: string | null
}

const initialState: CustomersState = {
  customers: [],
  selectedCustomer: null,
  isLoading: false,
  error: null,
}

export const fetchCustomers = createAsyncThunk('customers/fetchCustomers', async () => {
  const res = await api.get<{ data: CustomerWithLoyalty[] }>('/customers')
  return res.data
})

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string) => {
    const res = await api.get<{ data: CustomerWithLoyalty }>(`/customers/${id}`)
    return res.data
  },
)

const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setSelectedCustomer(state, action: PayloadAction<CustomerWithLoyalty | null>) {
      state.selectedCustomer = action.payload
    },
    clearSelectedCustomer(state) {
      state.selectedCustomer = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false
        state.customers = action.payload
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch customers'
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.selectedCustomer = action.payload
      })
  },
})

export const { setSelectedCustomer, clearSelectedCustomer } = customersSlice.actions
export default customersSlice.reducer
