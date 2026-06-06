import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import cartReducer from './slices/cartSlice'
import posReducer from './slices/posSlice'
import storeReducer from './slices/storeSlice'
import productsReducer from './slices/productsSlice'
import customersReducer from './slices/customersSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    pos: posReducer,
    storeConfig: storeReducer,
    products: productsReducer,
    customers: customersReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
