'use client'

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api/client'
import type { Product, ProductCategory } from '@ultimate-pos/shared'

interface ProductsState {
  items: Product[]
  categories: ProductCategory[]
  isLoading: boolean
  error: string | null
}

const initialState: ProductsState = {
  items: [],
  categories: [],
  isLoading: false,
  error: null,
}

export const fetchProducts = createAsyncThunk('products/fetchProducts', async () => {
  const res = await api.get<{ data: Product[] }>('/products')
  return res.data
})

export const fetchCategories = createAsyncThunk('products/fetchCategories', async () => {
  const res = await api.get<{ data: ProductCategory[] }>('/categories')
  return res.data
})

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearProducts(state) {
      state.items = []
      state.categories = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch products'
      })
      .addCase(fetchCategories.pending, (state) => { state.isLoading = true; state.error = null })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false
        state.categories = action.payload
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch categories'
      })
  },
})

export const { clearProducts } = productsSlice.actions
export default productsSlice.reducer
