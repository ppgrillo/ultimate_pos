import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Product, ProductCategory } from '@ultimate-pos/shared'

interface ProductsState {
  items: Product[]
  categories: ProductCategory[]
}

const initialState: ProductsState = {
  items: [],
  categories: [],
}

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts(state, action: PayloadAction<Product[]>) {
      state.items = action.payload
    },
    setCategories(state, action: PayloadAction<ProductCategory[]>) {
      state.categories = action.payload
    },
    clearProducts(state) {
      state.items = []
      state.categories = []
    },
  },
})

export const { setProducts, setCategories, clearProducts } = productsSlice.actions
export default productsSlice.reducer
