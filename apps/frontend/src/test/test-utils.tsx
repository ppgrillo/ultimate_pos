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

/**
 * A ready-to-use store for tests that render components gated on the store
 * request.
 *
 * Components block checkout while `GET /stores/current` is pending or failed (see
 * `useStoreCheckoutReady`), so tests exercising those components must supply a
 * ready store. Opt-in on purpose: applying it globally would silently change what
 * unrelated components render (e.g. `DesktopLeftNav` shows the store name in place
 * of its 'NeoPOS' fallback).
 */
export const readyStoreState: NonNullable<
  Partial<ReturnType<typeof rootReducer>>['storeConfig']
> = {
  status: 'ready',
  currentStore: {
    id: 's1',
    name: 'Store',
    slug: 'store',
    address: null,
    phone: null,
    tax_rate: 0,
    currency: 'USD',
    owner_id: 'o1',
    is_active: true,
    settings: { hasKitchen: false, checkoutMode: 'order-only' },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  } as unknown as NonNullable<
    ReturnType<typeof rootReducer>
  >['storeConfig']['currentStore'],
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
