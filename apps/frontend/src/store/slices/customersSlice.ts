'use client'

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { api } from '@/lib/api/client'
import type { Customer, LoyaltyCard, CommunicationLog, CustomerInput } from '@ultimate-pos/shared'

export interface CustomerWithLoyalty extends Customer {
  loyalty?: LoyaltyCard
}

interface CustomerStats {
  totalCustomers: number
  newThisMonth: number
  topSpenders: Array<{ name: string; total_spent: number }>
  mostVisits: number
  avgOrderValue: number
}

export interface CustomerSummary {
  customer: CustomerWithLoyalty
  recentOrders: any[]
  lastVisit: string | null
  upcomingBirthday: number | null
}

interface CustomersState {
  customers: CustomerWithLoyalty[]
  selectedCustomer: CustomerWithLoyalty | null
  customerOrders: any[]
  communicationLog: CommunicationLog[]
  stats: CustomerStats | null
  customerSummary: CustomerSummary | null
  isLoading: boolean
  isLoadingOrders: boolean
  isLoadingContact: boolean
  isLoadingStats: boolean
  isLoadingSummary: boolean
  error: string | null
}

const initialState: CustomersState = {
  customers: [],
  selectedCustomer: null,
  customerOrders: [],
  communicationLog: [],
  stats: null,
  customerSummary: null,
  isLoading: false,
  isLoadingOrders: false,
  isLoadingContact: false,
  isLoadingStats: false,
  isLoadingSummary: false,
  error: null,
}

export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (params?: { search?: string; tag?: string; source?: string; sort?: string }) => {
    const queryParams: Record<string, string> = {}
    if (params?.search) queryParams.search = params.search
    if (params?.tag) queryParams.tag = params.tag
    if (params?.source) queryParams.source = params.source
    if (params?.sort) queryParams.sort = params.sort
    const res = await api.get<{ data: CustomerWithLoyalty[] }>('/customers', {
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    })
    return res.data
  },
)

export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string) => {
    const res = await api.get<{ data: CustomerWithLoyalty }>(`/customers/${id}`)
    return res.data
  },
)

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (input: CustomerInput) => {
    const res = await api.post<{ data: CustomerWithLoyalty }>('/customers', input)
    return res.data
  },
)

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, ...input }: CustomerInput & { id: string }) => {
    const res = await api.patch<{ data: CustomerWithLoyalty }>(`/customers/${id}`, input)
    return res.data
  },
)

export const fetchCustomerOrders = createAsyncThunk(
  'customers/fetchCustomerOrders',
  async ({ id, limit, offset }: { id: string; limit?: number; offset?: number }) => {
    const params: Record<string, string> = {}
    if (limit) params.limit = String(limit)
    if (offset) params.offset = String(offset)
    const res = await api.get<{ data: any[] }>(`/customers/${id}/orders`, {
      params: Object.keys(params).length > 0 ? params : undefined,
    })
    return res.data
  },
)

export const fetchCommunicationLog = createAsyncThunk(
  'customers/fetchCommunicationLog',
  async (customerId: string) => {
    const res = await api.get<{ data: CommunicationLog[] }>(`/customers/${customerId}/contact`)
    return res.data
  },
)

export const addCommunication = createAsyncThunk(
  'customers/addCommunication',
  async ({ customerId, ...input }: { customerId: string; type: string; subject?: string; message?: string }) => {
    const res = await api.post<{ data: CommunicationLog }>(`/customers/${customerId}/contact`, input)
    return res.data
  },
)

export const fetchCustomerSummary = createAsyncThunk(
  'customers/fetchCustomerSummary',
  async (id: string) => {
    const res = await api.get<{ data: CustomerSummary }>(`/customers/${id}/summary`)
    return res.data
  },
)

export const fetchCustomerStats = createAsyncThunk(
  'customers/fetchCustomerStats',
  async () => {
    const res = await api.get<{ data: CustomerStats }>('/customers/stats')
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
      state.customerOrders = []
      state.communicationLog = []
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
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.customers.unshift(action.payload)
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const idx = state.customers.findIndex((c) => c.id === action.payload.id)
        if (idx >= 0) state.customers[idx] = action.payload
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload
        }
      })
      .addCase(fetchCustomerOrders.pending, (state) => { state.isLoadingOrders = true })
      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.isLoadingOrders = false
        state.customerOrders = action.payload
      })
      .addCase(fetchCustomerOrders.rejected, (state) => { state.isLoadingOrders = false })
      .addCase(fetchCommunicationLog.pending, (state) => { state.isLoadingContact = true })
      .addCase(fetchCommunicationLog.fulfilled, (state, action) => {
        state.isLoadingContact = false
        state.communicationLog = action.payload
      })
      .addCase(fetchCommunicationLog.rejected, (state) => { state.isLoadingContact = false })
      .addCase(fetchCustomerSummary.pending, (state) => { state.isLoadingSummary = true })
      .addCase(fetchCustomerSummary.fulfilled, (state, action) => {
        state.isLoadingSummary = false
        state.customerSummary = action.payload
      })
      .addCase(fetchCustomerSummary.rejected, (state) => { state.isLoadingSummary = false })
      .addCase(addCommunication.fulfilled, (state, action) => {
        state.communicationLog.unshift(action.payload)
      })
      .addCase(fetchCustomerStats.pending, (state) => { state.isLoadingStats = true })
      .addCase(fetchCustomerStats.fulfilled, (state, action) => {
        state.isLoadingStats = false
        state.stats = action.payload
      })
      .addCase(fetchCustomerStats.rejected, (state) => { state.isLoadingStats = false })
  },
})

export const { setSelectedCustomer, clearSelectedCustomer } = customersSlice.actions
export default customersSlice.reducer
