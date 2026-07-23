import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  Customer,
  CustomerInput,
  CommunicationLog,
  ModifierGroup,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductCategory,
  Promotion,
  PromotionFormData,
  PromotionValidationResponse,
  Store,
  StoreSettings,
  ScanLoyaltyResult,
} from '@ultimate-pos/shared'

export interface CustomerWithLoyalty extends Customer {
  loyalty?: {
    tier?: string
    points?: number
  }
}

export interface CustomerStats {
  totalCustomers: number
  newThisMonth: number
  topSpenders: Array<{ name: string; total_spent: number }>
  mostVisits: number
  avgOrderValue: number
}

export interface DashboardStats {
  todayRevenue: number
  todayOrderCount: number
  activeOrders: number
  avgOrderValue: number
  salesByHour: Array<{ hour: number; label: string; revenue: number; count: number }>
}

export interface SalesData {
  revenue: number
  orderCount: number
  avgOrderValue: number
  previousPeriodRevenue: number
  revenueChange: number
  revenueByTime: Array<{ label: string; revenue: number; count: number }>
}

export interface ProductAnalytics {
  productId: string
  name: string
  quantitySold: number
  revenue: number
}

export interface AnalyticsOverview {
  revenue: number
  revenueChange: number
  orderCount: number
  orderChange: number
  avgOrderValue: number
  avgChange: number
  newCustomers: number
  ordersByType: Record<string, number>
  ordersByPayment: Record<string, number>
  revenueByPayment: Record<string, number>
  paymentStatusBreakdown: Record<string, number>
}

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface CustomerSummary {
  customer: CustomerWithLoyalty
  recentOrders: any[]
  lastVisit: string | null
  upcomingBirthday: number | null
}

export type OrderTab = 'active' | 'completed' | 'all'

export interface ProductUpsertInput {
  name: string
  price: number
  cost: number | null
  sku: string | null
  barcode: string | null
  description: string | null
  category_id: string | null
  image_url: string | null
  modifiers: ModifierGroup[]
  points: number | null
  stock_qty: number | null
  track_inventory: boolean
  low_stock_threshold: number | null
  tax_exempt: boolean
}

export interface OrderCreateInput {
  customer_id?: string
  type: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
    modifiers: string[]
    notes: string | null
  }>
  notes?: string | null
  discount?: number
  discount_label?: string | null
  promo_discount?: number
  applied_promotions?: Array<{
    promotion_id: string
    name: string
    discount_amount: number
  }>
  redeemed_points?: number
  payment_method?: PaymentMethod
  cash_amount_given?: number
}

interface LoyaltyCardData {
  id: string
  customer_id: string
  points: number
  tier: string
  digital_pass_id: string | null
  google_pass_id: string | null
  apple_pass_id: string | null
  digital_passes?: {
    id: string
    apple_pass_id: string | null
    google_pass_id: string | null
  }
}

interface LoyaltyTransactionData {
  id: string
  type: string
  points: number
  balance_after: number
  description: string | null
  created_at: string
}

interface EnrollResult {
  card: LoyaltyCardData
  pass: { id: string }
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      const token = (globalThis as any).__apiToken ?? null
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Product', 'Category', 'Customer', 'Order', 'Store', 'Terminal', 'LoyaltyCard', 'Promotion'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => '/products',
      transformResponse: (response: { data: Product[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              { type: 'Product' as const, id: 'LIST' },
              ...result.map((item) => ({ type: 'Product' as const, id: item.id })),
            ]
          : [{ type: 'Product' as const, id: 'LIST' }],
    }),
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      transformResponse: (response: { data: Product }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<Product, ProductUpsertInput>({
      query: (body) => ({
        url: '/products',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: Product }) => response.data,
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    updateProduct: builder.mutation<Product, { id: string; body: ProductUpsertInput }>({
      query: ({ id, body }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: { data: Product }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    deleteProductsBatch: builder.mutation<{ deleted: number }, { ids: string[] }>({
      query: (body) => ({
        url: '/products/batch',
        method: 'DELETE',
        body,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    toggleProductPin: builder.mutation<Product, { id: string }>({
      query: ({ id }) => ({
        url: `/products/${id}/toggle-pin`,
        method: 'POST',
      }),
      transformResponse: (response: { data: Product }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    getCategories: builder.query<ProductCategory[], void>({
      query: () => '/categories',
      transformResponse: (response: { data: ProductCategory[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              { type: 'Category' as const, id: 'LIST' },
              ...result.map((item) => ({ type: 'Category' as const, id: item.id })),
            ]
          : [{ type: 'Category' as const, id: 'LIST' }],
    }),
    createCategory: builder.mutation<ProductCategory, { name: string; description?: string }>({
      query: (body) => ({
        url: '/categories',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: ProductCategory }) => response.data,
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    getCurrentStore: builder.query<Store, void>({
      query: () => '/stores/current',
      providesTags: [{ type: 'Store', id: 'CURRENT' }],
    }),
    updateStoreSettings: builder.mutation<Store, Partial<StoreSettings & { taxRate?: number; name?: string }>>({
      query: (settings) => ({
        url: '/stores/settings',
        method: 'PUT',
        body: { settings },
      }),
      transformResponse: (response: { settings: StoreSettings; tax_rate?: number }) => response as unknown as Store,
      invalidatesTags: [{ type: 'Store', id: 'CURRENT' }],
    }),
    getTerminals: builder.query<{ terminals: Array<{ id: string; model: string; operating_mode: string }> }, void>({
      query: () => '/stores/terminals',
      providesTags: [{ type: 'Terminal', id: 'LIST' }],
    }),
    setupPdv: builder.mutation<{ success: boolean }, { terminalId: string }>({
      query: (body) => ({
        url: '/stores/terminals/setup-pdv',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Terminal', id: 'LIST' }],
    }),
    cancelQueuedMpOrders: builder.mutation<{ cancelled: number; message?: string; errors?: string[] }, void>({
      query: () => ({
        url: '/stores/terminals/cancel-queued',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Terminal', id: 'LIST' }],
    }),
    getCustomers: builder.query<CustomerWithLoyalty[], { search?: string; tag?: string; source?: string; sort?: string } | void>({
      query: (params) => ({
        url: '/customers',
        params: params ? Object.fromEntries(Object.entries(params).filter(([, value]) => value)) : undefined,
      }),
      transformResponse: (response: { data: CustomerWithLoyalty[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              { type: 'Customer' as const, id: 'LIST' },
              ...result.map((item) => ({ type: 'Customer' as const, id: item.id })),
            ]
          : [{ type: 'Customer' as const, id: 'LIST' }],
    }),
    getCustomerById: builder.query<CustomerWithLoyalty, string>({
      query: (id) => `/customers/${id}`,
      transformResponse: (response: { data: CustomerWithLoyalty }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id }],
    }),
    getCustomerSummary: builder.query<CustomerSummary, string>({
      query: (id) => `/customers/${id}/summary`,
      transformResponse: (response: { data: CustomerSummary }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id: `summary-${id}` }],
    }),
    getCustomerOrders: builder.query<any[], { id: string; limit?: number; offset?: number }>({
      query: ({ id, limit, offset }) => ({
        url: `/customers/${id}/orders`,
        params: {
          ...(limit ? { limit: String(limit) } : {}),
          ...(offset ? { offset: String(offset) } : {}),
        },
      }),
      transformResponse: (response: { data: any[] }) => response.data,
      providesTags: (_result, _error, { id }) => [{ type: 'Customer', id: `orders-${id}` }],
    }),
    getCommunicationLog: builder.query<CommunicationLog[], string>({
      query: (id) => `/customers/${id}/contact`,
      transformResponse: (response: { data: CommunicationLog[] }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Customer', id: `contact-${id}` }],
    }),
    getCustomerStats: builder.query<CustomerStats, void>({
      query: () => '/customers/stats',
      transformResponse: (response: { data: CustomerStats }) => response.data,
      providesTags: [{ type: 'Customer', id: 'STATS' }],
    }),
    createCustomer: builder.mutation<CustomerWithLoyalty, CustomerInput>({
      query: (body) => ({
        url: '/customers',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: CustomerWithLoyalty }) => response.data,
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }, { type: 'Customer', id: 'STATS' }],
    }),
    updateCustomer: builder.mutation<CustomerWithLoyalty, { id: string; body: CustomerInput }>({
      query: ({ id, body }) => ({
        url: `/customers/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: { data: CustomerWithLoyalty }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' },
        { type: 'Customer', id: 'STATS' },
      ],
    }),
    addCommunication: builder.mutation<CommunicationLog, { customerId: string; type: string; subject?: string; message?: string }>({
      query: ({ customerId, ...body }) => ({
        url: `/customers/${customerId}/contact`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: CommunicationLog }) => response.data,
      invalidatesTags: (_result, _error, { customerId }) => [
        { type: 'Customer', id: customerId },
        { type: 'Customer', id: `summary-${customerId}` },
        { type: 'Customer', id: `contact-${customerId}` },
      ],
    }),
    getOrders: builder.query<{ items: Order[]; total: number }, { tab?: OrderTab; limit?: number; offset?: number; startDate?: string; endDate?: string } | undefined>({
      query: (params) => {
        const p: Record<string, string | number> = { limit: params?.limit ?? 50, offset: params?.offset ?? 0 }
        if (params?.tab) p.tab = params.tab
        if (params?.startDate) p.startDate = params.startDate
        if (params?.endDate) p.endDate = params.endDate
        return { url: '/orders', params: p }
      },
      transformResponse: (response: { data: Order[]; total: number }) => ({ items: response.data, total: response.total }),
      providesTags: (result) =>
        result?.items
          ? [
              { type: 'Order' as const, id: 'LIST' },
              ...result.items.map((item) => ({ type: 'Order' as const, id: item.id })),
            ]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),
    getOrderById: builder.query<Order, string>({
      query: (id) => `/orders/${id}`,
      transformResponse: (response: { data: Order }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    createOrder: builder.mutation<{ id: string; metadata: { mpOrderId?: string } }, OrderCreateInput>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: { id: string; metadata: { mpOrderId?: string } } }) => response.data,
      invalidatesTags: [{ type: 'Order', id: 'LIST' }, { type: 'LoyaltyCard' }, { type: 'Customer' }],
    }),
    updateOrderStatus: builder.mutation<Order, { id: string; status: OrderStatus | string }>({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response: { data: Order }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    cancelMpOrder: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `/orders/${id}/cancel-mp`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    // ── Loyalty endpoints ──
    enrollCustomer: builder.mutation<EnrollResult, { customer_id: string }>({
      query: (body) => ({
        url: '/loyalty/enroll',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: EnrollResult }) => response.data,
      invalidatesTags: ['LoyaltyCard'],
    }),
    getLoyaltyCard: builder.query<LoyaltyCardData | null, string>({
      query: (customerId) => `/loyalty/card/${customerId}`,
      transformResponse: (response: { data: LoyaltyCardData | null }) => response.data,
      providesTags: (_result, _error, customerId) => [{ type: 'LoyaltyCard', id: customerId }],
    }),
    scanLoyaltyBarcode: builder.mutation<ScanLoyaltyResult, { barcode: string }>({
      query: (body) => ({
        url: '/loyalty/scan',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: ScanLoyaltyResult }) => response.data,
      invalidatesTags: ['LoyaltyCard', { type: 'Customer', id: 'LIST' }],
    }),
    getLoyaltyProgram: builder.query<{ id: string; name: string; pointsLabel: string }, void>({
      query: () => '/loyalty/program',
      transformResponse: (response: { data: any }) => response.data,
    }),
    getLoyaltyTransactions: builder.query<LoyaltyTransactionData[], string>({
      query: (cardId) => `/loyalty/transactions/${cardId}`,
      transformResponse: (response: { data: LoyaltyTransactionData[] }) => response.data,
      providesTags: ['LoyaltyCard'],
    }),
    // Manually add (positive) or remove (negative) points from a loyalty card. Admin only.
    adjustLoyaltyPoints: builder.mutation<{ new_balance: number }, { card_id: string; points: number; description?: string }>({
      query: (body) => ({ url: '/loyalty/adjust', method: 'POST', body }),
      transformResponse: (response: { data: { new_balance: number } }) => response.data,
      invalidatesTags: ['LoyaltyCard'],
    }),

    // ── Wallet endpoints ──
    getAppleWalletPassUrl: builder.query<string, string>({
      query: (passId) => `/wallet/apple/${passId}/download`,
      transformResponse: (response: { data: string }) => response.data,
    }),
    getGoogleWalletSaveUrl: builder.query<{ jwtUrl: string }, string>({
      query: (passId) => `/wallet/google/${passId}/save-url`,
      transformResponse: (response: { data: { jwtUrl: string } }) => response.data,
    }),
    // Creates or updates the Google Wallet LoyaltyClass for the store.
    // Must be called once after configuring wallet settings (admin only).
    syncGoogleWalletClass: builder.mutation<{ classId: string }, void>({
      query: () => ({ url: '/wallet/google/class', method: 'POST' }),
      transformResponse: (response: { data: { classId: string } }) => response.data,
    }),

    // ── Promotions endpoints ──
    getPromotions: builder.query<Promotion[], void>({
      query: () => '/promotions/all',
      transformResponse: (response: { data: Promotion[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              { type: 'Promotion' as const, id: 'LIST' },
              ...result.map((item) => ({ type: 'Promotion' as const, id: item.id })),
            ]
          : [{ type: 'Promotion' as const, id: 'LIST' }],
    }),
    getPromotionById: builder.query<Promotion, string>({
      query: (id) => `/promotions/${id}`,
      transformResponse: (response: { data: Promotion }) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Promotion', id }],
    }),
    createPromotion: builder.mutation<Promotion, PromotionFormData>({
      query: (body) => ({
        url: '/promotions',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: Promotion }) => response.data,
      invalidatesTags: [{ type: 'Promotion', id: 'LIST' }],
    }),
    updatePromotion: builder.mutation<Promotion, { id: string; body: PromotionFormData }>({
      query: ({ id, body }) => ({
        url: `/promotions/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: { data: Promotion }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Promotion', id },
        { type: 'Promotion', id: 'LIST' },
      ],
    }),
    deletePromotion: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/promotions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Promotion', id },
        { type: 'Promotion', id: 'LIST' },
      ],
    }),
    togglePromotion: builder.mutation<Promotion, { id: string; is_active: boolean }>({
      query: ({ id, is_active }) => ({
        url: `/promotions/${id}/toggle`,
        method: 'PATCH',
        body: { is_active },
      }),
      transformResponse: (response: { data: Promotion }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Promotion', id },
        { type: 'Promotion', id: 'LIST' },
      ],
    }),
    validatePromotions: builder.mutation<PromotionValidationResponse, { items: Array<{ product_id: string; quantity: number; price: number; category_id?: string }>; subtotal?: number }>({
      query: (body) => ({
        url: '/promotions/validate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: PromotionValidationResponse }) => response.data,
    }),

    // ── Analytics endpoints ──
    getDashboardStats: builder.query<DashboardStats, { tz?: string }>({
      query: (params) => ({
        url: '/analytics/dashboard-stats',
        params: params.tz ? { tz: params.tz } : {},
      }),
      transformResponse: (response: { data: DashboardStats }) => response.data,
    }),
    getAnalyticsSales: builder.query<SalesData, { period: AnalyticsPeriod; from?: string; to?: string; tz?: string }>({
      query: (params) => ({
        url: '/analytics/sales',
        params: { period: params.period, ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}), ...(params.tz ? { tz: params.tz } : {}) },
      }),
      transformResponse: (response: { data: SalesData }) => response.data,
    }),
    getAnalyticsProducts: builder.query<ProductAnalytics[], { period: AnalyticsPeriod; from?: string; to?: string; limit?: number; tz?: string }>({
      query: (params) => ({
        url: '/analytics/products',
        params: { period: params.period, ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}), limit: params.limit ?? 10, ...(params.tz ? { tz: params.tz } : {}) },
      }),
      transformResponse: (response: { data: ProductAnalytics[] }) => response.data,
    }),
    getAnalyticsOverview: builder.query<AnalyticsOverview, { period: AnalyticsPeriod; from?: string; to?: string; tz?: string }>({
      query: (params) => ({
        url: '/analytics/overview',
        params: { period: params.period, ...(params.from ? { from: params.from } : {}), ...(params.to ? { to: params.to } : {}), ...(params.tz ? { tz: params.tz } : {}) },
      }),
      transformResponse: (response: { data: AnalyticsOverview }) => response.data,
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductsBatchMutation,
  useToggleProductPinMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useGetCurrentStoreQuery,
  useUpdateStoreSettingsMutation,
  useLazyGetTerminalsQuery,
  useSetupPdvMutation,
  useCancelQueuedMpOrdersMutation,
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useGetCustomerSummaryQuery,
  useGetCustomerOrdersQuery,
  useGetCommunicationLogQuery,
  useGetCustomerStatsQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useAddCommunicationMutation,
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useCancelMpOrderMutation,
  useEnrollCustomerMutation,
  useGetLoyaltyCardQuery,
  useLazyGetLoyaltyCardQuery,
  useScanLoyaltyBarcodeMutation,
  useGetLoyaltyProgramQuery,
  useGetLoyaltyTransactionsQuery,
  useAdjustLoyaltyPointsMutation,
  useGetAppleWalletPassUrlQuery,
  useGetGoogleWalletSaveUrlQuery,
  useSyncGoogleWalletClassMutation,
  useGetPromotionsQuery,
  useGetPromotionByIdQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useDeletePromotionMutation,
  useTogglePromotionMutation,
  useValidatePromotionsMutation,
  useGetDashboardStatsQuery,
  useGetAnalyticsSalesQuery,
  useGetAnalyticsProductsQuery,
  useGetAnalyticsOverviewQuery,
} = api
