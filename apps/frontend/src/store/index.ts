import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import cartReducer from './slices/cartSlice'
import posReducer from './slices/posSlice'
import storeReducer from './slices/storeSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    pos: posReducer,
    storeConfig: storeReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
