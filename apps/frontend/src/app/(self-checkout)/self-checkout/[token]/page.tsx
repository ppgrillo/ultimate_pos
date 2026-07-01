'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { api, setApiToken } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/image-proxy'
import { PosSearchBar } from '@/components/pos/PosSearchBar'
import { QRScannerPopover } from '@/components/pos/QRScannerPopover'
import { CategoryChips } from '@/components/pos/CategoryChips'
import { ProductCard } from '@/components/pos/ProductCard'
import { OrderSummary } from '@/components/pos/OrderSummary'
import { QuantityStepper } from '@/components/pos/QuantityStepper'
import { MPPointPayment } from '@/components/pos/MPPointPayment'
import {
  ShoppingBag,
  X,
  Percent,
  CheckCircle2,
  Receipt,
  Search,
  Scan,
  Trash2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Star,
  Heart,
  Tag,
  Clock,
  ArrowRight,
} from 'lucide-react'
import type { Product, ProductCategory, ScanLoyaltyResult, Customer, LoyaltyCardData } from '@ultimate-pos/shared'

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
}

type PageState = 'loading' | 'error' | 'browsing' | 'payment' | 'success'

export default function SelfCheckoutPage() {
  const params = useParams()
  const token = params.token as string

  // ─── Page & store state ───────────────────────────────────────────────────
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [storeName, setStoreName] = useState('')
  const [stationName, setStationName] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxLabel, setTaxLabel] = useState('Tax')
  const [taxInclusive, setTaxInclusive] = useState(false)

  // ─── Catalogue ───────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [discountLabel, setDiscountLabel] = useState('')

  // ─── Promo modal ──────────────────────────────────────────────────────────
  const [showPromo, setShowPromo] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoMode, setPromoMode] = useState<'percent' | 'fixed'>('percent')

  // ─── Customer ─────────────────────────────────────────────────────────────
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer | null | undefined>(undefined)
  const [searchingCustomer, setSearchingCustomer] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  // ─── Customer detail (rich profile) ────────────────────────────────────────
  interface CustomerProfile {
    customer: Customer
    loyalty?: LoyaltyCardData
    recentOrders?: Array<{
      id: string
      order_number: number
      total: number
      created_at: string
      items: Array<{ product_name: string; quantity: number }>
    }>
  }

  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null)
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // ─── Order / payment ──────────────────────────────────────────────────────
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [lastOrder, setLastOrder] = useState<{
    total: number
    items: { name: string; quantity: number }[]
  } | null>(null)

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    setApiToken(token)
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadData() {
    try {
      const [verifyRes, productsRes, categoriesRes] = await Promise.all([
        api.get<{ data: { store: { name: string; tax_rate?: number; settings?: Record<string, unknown> }; station: { name: string } } }>('/self-checkout/verify'),
        api.get<{ data: Product[] }>('/self-checkout/products'),
        api.get<{ data: ProductCategory[] }>('/self-checkout/categories'),
      ])

      const storeData = verifyRes.data.store
      const settings = storeData.settings as Record<string, unknown> | undefined
      setStoreName(storeData.name)
      setStationName(verifyRes.data.station.name)
      setTaxRate(storeData.tax_rate ? Number(storeData.tax_rate) / 100 : 0)
      setTaxEnabled((settings?.taxEnabled as boolean) ?? false)
      setTaxLabel((settings?.taxLabel as string) ?? 'Tax')
      setTaxInclusive((settings?.taxInclusive as boolean) ?? false)
      setProducts(productsRes.data)
      setCategories(categoriesRes.data)
      setPageState('browsing')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading self-checkout'
      setErrorMsg(msg)
      setPageState('error')
    }
  }

  // ─── Customer search ──────────────────────────────────────────────────────
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!customerSearchQuery.trim()) {
      setCustomerSearchResults(undefined)
      return
    }
    setSearchingCustomer(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get<{ data: Customer | null }>(
          `/self-checkout/customers/lookup?code=${encodeURIComponent(customerSearchQuery.trim())}`,
        )
        setCustomerSearchResults(res.data)
      } catch {
        setCustomerSearchResults(null)
      } finally {
        setSearchingCustomer(false)
      }
    }, 500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearchQuery])

  // ─── Safe fetch (avoids SessionSyncProvider token overwrite) ────────────
  const apiFetch = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(`/api/self-checkout${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error || `HTTP ${res.status}`)
    }
    return res.json()
  }, [token])

  // ─── QR scan handler ────────────────────────────────────────────────────
  const handleScan = useCallback(async (barcode: string) => {
    const json = await apiFetch<{ data: ScanLoyaltyResult }>('/loyalty/scan', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    })
    return json.data
  }, [apiFetch])

  const handleScanSuccess = useCallback((result: ScanLoyaltyResult) => {
    setCustomerProfile({
      customer: result.customer,
      loyalty: result.loyaltyCard,
    })
    setProfileExpanded(true)
  }, [])

  // ─── Customer search → profile ──────────────────────────────────────────
  const handleSelectSearchResult = useCallback(async (customer: Customer) => {
    setCustomerSearchQuery('')
    setCustomerSearchResults(undefined)
    setLoadingProfile(true)
    try {
      const json = await apiFetch<{ data: { customer: Customer; loyaltyCard: LoyaltyCardData | null; recentOrders: Array<{ id: string; order_number: number; total: number; created_at: string; items: Array<{ product_name: string; quantity: number }> }> } }>(
        `/customers/${customer.id}/detail`,
      )
      setCustomerProfile({
        customer: json.data.customer,
        loyalty: json.data.loyaltyCard || undefined,
        recentOrders: json.data.recentOrders,
      })
    } catch {
      setCustomerProfile({ customer })
    } finally {
      setLoadingProfile(false)
      setProfileExpanded(true)
    }
  }, [apiFetch])

  function formatDate(iso: string | null) {
    if (!iso) return null
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function calcUpcomingBirthday(birthday: string | null): number | null {
    if (!birthday) return null
    const today = new Date()
    const bd = new Date(birthday)
    const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate())
    const diff = Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff >= 0) return diff
    const nextYear = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate())
    return Math.ceil((nextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    if (!p.is_active) return false
    if (selectedCategory && p.category_id !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const cat = categories.find((c) => c.id === p.category_id)
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (cat?.name.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  // ─── Cart mutations ───────────────────────────────────────────────────────
  function handleAdd(product: Product) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          image_url: product.image_url,
        },
      ]
    })
  }

  function handleQuantityChange(productId: string, qty: number) {
    if (qty === 0) {
      setCartItems((prev) => prev.filter((i) => i.product_id !== productId))
    } else {
      setCartItems((prev) =>
        prev.map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i)),
      )
    }
  }

  function handleClearCart() {
    setCartItems([])
    setDiscount(0)
    setDiscountLabel('')
  }

  // ─── Promo ────────────────────────────────────────────────────────────────
  function applyPromo() {
    const val = parseFloat(promoInput)
    if (!val || val <= 0) return
    if (promoMode === 'percent') {
      const amount = Math.round(subtotal * (val / 100) * 100) / 100
      setDiscount(amount)
      setDiscountLabel(`${val}% Off`)
    } else {
      const amount = Math.min(val, subtotal)
      setDiscount(amount)
      setDiscountLabel(`${formatCurrency(val)} Off`)
    }
    setShowPromo(false)
    setPromoInput('')
  }

  // ─── Checkout / payment ───────────────────────────────────────────────────
  async function handleCheckout() {
    if (cartItems.length === 0) return
    setIsCreatingOrder(true)
    try {
      const json = await apiFetch<{ data: { id: string; metadata: { mpOrderId: string } } }>(
        '/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            items: cartItems.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              unit_price: i.price,
            })),
            customer_id: customerProfile?.customer.id || undefined,
            discount: discount > 0 ? discount : undefined,
            discount_label: discount > 0 ? discountLabel : undefined,
          }),
        },
      )
      setOrderId(json.data.id)
      setPageState('payment')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error creating order')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  function handlePaid() {
    setLastOrder({
      total: subtotal - discount,
      items: cartItems.map((i) => ({ name: i.name, quantity: i.quantity })),
    })
    setPageState('success')
  }

  function handlePaymentCancel() {
    setOrderId(null)
    setPageState('browsing')
  }

  function handleNewOrder() {
    setCartItems([])
    setDiscount(0)
    setDiscountLabel('')
    setCustomerProfile(null)
    setCustomerSearchQuery('')
    setOrderId(null)
    setLastOrder(null)
    setPageState('browsing')
  }

  // ─── Loading / Error screens ──────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant">Iniciando autopago...</p>
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
            <X className="h-8 w-8 text-error" />
          </div>
          <h1 className="text-xl font-headline font-bold text-on-surface">Error de conexión</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{errorMsg}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Contacta al administrador para obtener un nuevo enlace.
          </p>
        </div>
      </div>
    )
  }

  // ─── Success screen ───────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-headline font-bold text-on-surface">¡Pago exitoso!</h2>
        <p className="mt-2 text-sm text-on-surface-variant">Tu pedido ha sido registrado</p>

        <div className="mt-8 w-full max-w-sm rounded-xl border border-outline-variant/50 bg-surface-container/50 p-4 text-left">
          <div className="space-y-2 text-sm">
            {lastOrder?.items.map((item, i) => (
              <div key={i} className="flex justify-between text-on-surface">
                <span>
                  {item.quantity}x {item.name}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-outline-variant/50 pt-3">
            <div className="flex justify-between font-headline font-bold text-lg text-on-surface">
              <span>Total</span>
              <span>{formatCurrency(lastOrder?.total ?? 0)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleNewOrder}
          className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-label font-bold text-primary-on transition-transform active:scale-[0.98]"
        >
          <Receipt className="h-4 w-4" />
          Nuevo pedido
        </button>
      </div>
    )
  }

  // ─── Main POS-style layout ────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── LEFT: Products ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Store header */}
        <header className="shrink-0 border-b border-outline-variant/50 bg-surface-container/80 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-headline font-bold text-on-surface leading-tight">
                {storeName}
              </h1>
              <p className="text-xs text-on-surface-variant">{stationName}</p>
            </div>
          </div>
        </header>

        {/* Search + Categories */}
        <div className="shrink-0 space-y-2 px-3 pb-2 pt-3">
          <PosSearchBar value={searchQuery} onChange={setSearchQuery} />
          <CategoryChips
            categories={categories}
            selectedId={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-on-surface-variant/30" />
              <p className="text-sm text-on-surface-variant">No se encontraron productos</p>
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
            >
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAdd}
                  variant="dense"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart sidebar ─────────────────────────────────────── */}
      <div className="flex w-[340px] shrink-0 flex-col border-l border-outline-variant/50 bg-surface-container/30">

        {/* Customer section */}
        <div className="relative shrink-0 border-b border-outline-variant/50 px-4 py-3 space-y-2">
          {!customerProfile && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={customerSearchQuery}
                onChange={(e) => {
                  setCustomerSearchQuery(e.target.value)
                  if (!e.target.value) {
                    setCustomerSearchResults(undefined)
                  }
                }}
                placeholder="Buscar cliente..."
                className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-10 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                onClick={() => setScannerOpen(true)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                title="Escanear tarjeta de lealtad"
              >
                <Scan className="h-4 w-4" />
              </button>
            </div>
          )}

          <QRScannerPopover
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            variant="popover"
            onScan={handleScan}
            onScanSuccess={handleScanSuccess}
          />

          {/* Customer profile card (POS-style) */}
          {customerProfile ? (
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-3 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface">
                  {customerProfile.customer.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="min-w-0 truncate font-headline font-bold text-sm text-on-surface">{customerProfile.customer.name}</p>
                    {customerProfile.loyalty?.tier && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider ${
                        customerProfile.loyalty.tier === 'platinum' ? 'bg-primary/20 text-primary' :
                        customerProfile.loyalty.tier === 'gold' ? 'bg-amber-400/20 text-amber-400' :
                        customerProfile.loyalty.tier === 'silver' ? 'bg-slate-400/20 text-slate-300' :
                        'bg-orange-600/20 text-orange-400'
                      }`}>
                        {customerProfile.loyalty.tier}
                      </span>
                    )}
                  </div>
                  {customerProfile.customer.email && (
                    <p className="truncate text-[11px] text-on-surface-variant">{customerProfile.customer.email}</p>
                  )}
                  {customerProfile.customer.phone && (
                    <p className="truncate text-[11px] text-on-surface-variant">{customerProfile.customer.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => setProfileExpanded((v) => !v)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                    profileExpanded
                      ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(204,255,0,0.12),0_0_18px_rgba(204,255,0,0.18)]'
                      : 'border-outline-variant/70 bg-surface-container/70 text-on-surface-variant hover:border-primary/30 hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  {profileExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setCustomerProfile(null)
                    setCustomerSearchQuery('')
                    setCustomerSearchResults(undefined)
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary" />
                  <span className="font-label font-bold">{customerProfile.loyalty?.points || 0} Points</span>
                </div>
                <span className="text-outline-variant">·</span>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-secondary" />
                  <span>{customerProfile.customer.total_visits} visits</span>
                </div>
              </div>

              {/* Expandable details */}
              <div className={`grid transition-[grid-template-rows,opacity,transform,margin-top] duration-300 ease-in-out ${
                profileExpanded ? 'mt-0 opacity-100 grid-rows-[1fr]' : '-mt-1 opacity-0 grid-rows-[0fr] pointer-events-none'
              }`}>
                <div className="overflow-hidden">
                  <div className="space-y-2 pt-1">
                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                        <Star className="mx-auto mb-1 h-4 w-4 text-primary" />
                        <p className="text-sm font-bold text-on-surface">{customerProfile.loyalty?.points || 0}</p>
                        <p className="text-[10px] text-on-surface-variant">Points</p>
                      </div>
                      <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                        <ShoppingBag className="mx-auto mb-1 h-4 w-4 text-secondary" />
                        <p className="text-sm font-bold text-on-surface">${Number(customerProfile.customer.total_spent || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-on-surface-variant">Total Spent</p>
                      </div>
                      <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                        <Tag className="mx-auto mb-1 h-4 w-4 text-tertiary" />
                        <p className="text-sm font-bold text-on-surface">{customerProfile.customer.total_visits}</p>
                        <p className="text-[10px] text-on-surface-variant">Visits</p>
                      </div>
                    </div>

                    {/* Last visit + Birthday */}
                    <div className="space-y-2">
                      {(customerProfile.recentOrders && customerProfile.recentOrders.length > 0) && (
                        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/40 px-3 py-2">
                          <Clock className="h-4 w-4 text-on-surface-variant" />
                          <span className="text-xs text-on-surface-variant">
                            Last visit: <span className="font-bold text-on-surface">{formatDate(customerProfile.recentOrders[0].created_at)}</span>
                          </span>
                        </div>
                      )}

                      {calcUpcomingBirthday(customerProfile.customer.birthday) !== null && (
                        <div className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-container/40 px-3 py-2">
                          <Heart className="h-4 w-4 text-primary" />
                          <span className="text-xs text-on-surface-variant">
                            Birthday in <span className="font-bold text-primary">{calcUpcomingBirthday(customerProfile.customer.birthday)} days</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {customerProfile.customer.tags?.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                          <Tag className="h-3 w-3" /> Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {customerProfile.customer.tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-outline-variant/50 bg-surface-container-high px-2.5 py-0.5 text-[10px] text-on-surface-variant">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preferences */}
                    {Object.keys(customerProfile.customer.preferences || {}).length > 0 && (
                      <div className="space-y-1">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Preferences</p>
                        {Object.entries(customerProfile.customer.preferences).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg bg-surface-container/40 px-3 py-1.5 text-xs">
                            <span className="capitalize text-on-surface-variant">{key.replace(/_/g, ' ')}</span>
                            <span className="font-bold text-on-surface">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent orders */}
                    {customerProfile.recentOrders && customerProfile.recentOrders.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Recent Orders</p>
                        <div className="space-y-1.5">
                          {customerProfile.recentOrders.map((order) => (
                            <div key={order.id} className="rounded-lg bg-surface-container/40 px-3 py-2 text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <ShoppingBag className="h-3 w-3 text-on-surface-variant" />
                                  <span className="text-on-surface-variant">#{String(order.order_number ?? '').slice(-6) || order.id.slice(0, 6)}</span>
                                </div>
                                <span className="font-bold text-on-surface">${Number(order.total || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {order.items.map((item, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    {item.product_name || 'Product'}
                                    {item.quantity > 1 && <span className="text-primary/50">x{item.quantity}</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {loadingProfile && (
                      <div className="flex items-center justify-center py-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!customerSearchQuery && (
                <div>
                  <p className="text-xs text-on-surface-variant">Busca un cliente</p>
                  <p className="text-[10px] text-on-surface-variant/60">
                    Por nombre, email o teléfono
                  </p>
                </div>
              )}

              {/* Search results */}
              {customerSearchQuery && !searchingCustomer && (
                <>
                  {customerSearchResults ? (
                    <button
                      onClick={() => handleSelectSearchResult(customerSearchResults)}
                      className="flex w-full items-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container/60 px-3 py-2 hover:bg-surface-container transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-highest text-xs font-bold text-on-surface">
                        {customerSearchResults.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-xs font-bold text-on-surface">
                          {customerSearchResults.name}
                        </p>
                        <p className="truncate text-[10px] text-on-surface-variant">
                          {customerSearchResults.email || customerSearchResults.phone || ''}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant" />
                    </button>
                  ) : (
                    <p className="rounded-xl border border-outline-variant/40 bg-surface-container/30 px-3 py-2 text-xs text-on-surface-variant">
                      No se encontró cliente
                    </p>
                  )}
                </>
              )}

              {searchingCustomer && (
                <p className="text-xs text-on-surface-variant">Buscando...</p>
              )}
            </>
          )}
        </div>

        {/* Order summary header */}
        <div className="shrink-0 border-b border-outline-variant/50 px-4 py-2.5">
          <h2 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
            Orden ({cartCount} {cartCount === 1 ? 'producto' : 'productos'})
          </h2>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <ShoppingBag className="h-12 w-12 text-on-surface-variant/30 mb-3" />
              <p className="text-sm text-on-surface-variant">Carrito vacío</p>
              <p className="text-[11px] text-on-surface-variant/50 mt-1">
                Agrega productos para comenzar
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {cartItems.map((item) => (
                <SelfCheckoutCartRow
                  key={item.product_id}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                />
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="shrink-0 border-t border-outline-variant/50 px-4 py-3">
          <OrderSummary
            subtotal={subtotal}
            discount={discount}
            discountLabel={discountLabel}
            taxRate={taxRate}
            taxLabel={taxLabel}
            taxInclusive={taxInclusive}
            taxEnabled={taxEnabled}
          />
        </div>

        {/* Total row (large) */}
        <div className="shrink-0 border-t border-outline-variant/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-label font-bold text-sm text-on-surface-variant">Total</span>
            <span className="font-headline font-bold text-xl text-primary">
              {formatCurrency(
                taxInclusive
                  ? Math.round((subtotal - discount) * 100) / 100
                  : Math.round((subtotal * (1 + (taxEnabled ? taxRate : 0)) - discount) * 100) / 100,
              )}
            </span>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="shrink-0 border-t border-outline-variant/50 p-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowPromo(true)}
              disabled={cartItems.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant py-2.5 text-xs font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
            >
              <Percent className="h-3.5 w-3.5" />
              {discount > 0 ? `Promo (${discountLabel})` : 'Promo'}
            </button>
            <button
              onClick={handleClearCart}
              disabled={cartItems.length === 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant py-2.5 text-xs font-label font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar
            </button>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cartItems.length === 0 || isCreatingOrder}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-label font-bold text-primary-on hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isCreatingOrder ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-on border-t-transparent" />
                Procesando...
              </>
            ) : (
              <>
                <ShoppingBag className="h-5 w-5" />
                Completar pago
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Promo modal ────────────────────────────────────────────── */}
      {showPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-on-surface">Aplicar descuento</h3>
              <button
                onClick={() => { setShowPromo(false); setPromoInput('') }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-1 rounded-xl bg-surface-container-high p-1">
              <button
                onClick={() => setPromoMode('percent')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-label font-bold transition-colors ${
                  promoMode === 'percent'
                    ? 'bg-primary text-primary-on'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                % Porcentaje
              </button>
              <button
                onClick={() => setPromoMode('fixed')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-label font-bold transition-colors ${
                  promoMode === 'fixed'
                    ? 'bg-primary text-primary-on'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                $ Fijo
              </button>
            </div>

            <input
              type="number"
              min={0}
              step={promoMode === 'percent' ? 1 : 0.01}
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder={promoMode === 'percent' ? 'Ej: 10' : 'Ej: 5.00'}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-lg font-headline text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              autoFocus
            />

            <div className="flex gap-2">
              {discount > 0 && (
                <button
                  onClick={() => { setDiscount(0); setDiscountLabel(''); setShowPromo(false); setPromoInput('') }}
                  className="flex-1 rounded-xl border border-error/40 py-2.5 text-sm font-label font-bold text-error hover:bg-error/10 transition-colors"
                >
                  Quitar descuento
                </button>
              )}
              <button
                onClick={applyPromo}
                disabled={!promoInput || parseFloat(promoInput) <= 0}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-label font-bold text-primary-on disabled:opacity-40 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MP Point payment modal ──────────────────────────────────── */}
      <MPPointPayment
        open={pageState === 'payment'}
        onOpenChange={(open) => {
          if (!open) {
            setOrderId(null)
            setPageState('browsing')
          }
        }}
        orderId={orderId}
        isCreating={isCreatingOrder}
        total={
          taxInclusive
            ? Math.round((subtotal - discount) * 100) / 100
            : Math.round((subtotal * (1 + (taxEnabled ? taxRate : 0)) - discount) * 100) / 100
        }
        onPaid={handlePaid}
        onCancel={handlePaymentCancel}
        fetchOrder={(id) => apiFetch<any>(`/orders/${id}`)}
      />
    </div>
  )
}

// ─── Inline cart item row (no Redux dependency) ──────────────────────────────
interface SelfCheckoutCartRowProps {
  item: CartItem
  onQuantityChange: (productId: string, qty: number) => void
}

function SelfCheckoutCartRow({ item, onQuantityChange }: SelfCheckoutCartRowProps) {
  const [imgError, setImgError] = useState(false)
  const imageUrl =
    item.image_url && !imgError
      ? (proxyImageUrl(item.image_url) ?? item.image_url)
      : null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container/50 p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-high">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ShoppingCart className="h-5 w-5 text-on-surface-variant/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-headline font-bold text-sm text-on-surface">{item.name}</p>
        <p className="font-headline font-bold text-sm text-primary mt-0.5">
          {formatCurrency(item.price)}
        </p>
      </div>
      <QuantityStepper
        value={item.quantity}
        onChange={(qty) => onQuantityChange(item.product_id, qty)}
      />
    </div>
  )
}
