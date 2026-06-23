import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer from '@/store/slices/authSlice'
import cartReducer from '@/store/slices/cartSlice'
import posReducer from '@/store/slices/posSlice'
import storeReducer from '@/store/slices/storeSlice'
import productsReducer from '@/store/slices/productsSlice'
import customersReducer from '@/store/slices/customersSlice'
import orderReducer from '@/store/slices/orderSlice'
import uiReducer from '@/store/slices/uiSlice'
import { api } from '@/store/api'

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  pos: posReducer,
  storeConfig: storeReducer,
  products: productsReducer,
  customers: customersReducer,
  order: orderReducer,
  ui: uiReducer,
  [api.reducerPath]: api.reducer,
})

export function createTestStore(preloadedState?: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    preloadedState,
  })
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<ReturnType<typeof rootReducer>>
}

function AllProviders({ children, preloadedState }: { children: ReactNode; preloadedState?: Partial<ReturnType<typeof rootReducer>> }) {
  const store = createTestStore(preloadedState)
  return <Provider store={store}>{children}</Provider>
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { preloadedState, ...renderOptions } = options || {}
  return render(ui, {
    wrapper: () => <AllProviders preloadedState={preloadedState}>{ui}</AllProviders>,
    ...renderOptions,
  })
}

export * from '@testing-library/react'
export { customRender as render }
