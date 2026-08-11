'use client'

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react'
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
import { getActiveCardProvider, cardProviderDisplayName } from '@/lib/card-payments'
import { FloatingCartBar } from '@/components/pos/FloatingCartBar'
import { RewardsPanel } from '@/components/pos/RewardsPanel'
import { CustomizeProduct as SelfCheckoutCustomizeProduct } from '@/components/self-checkout/CustomizeProduct'
// LoyaltyData type imported inline where needed
import { QRCodeSVG } from 'qrcode.react';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import type { Promotion, Product, ProductCategory, ScanLoyaltyResult, Customer, LoyaltyCardData, LoyaltyReward, PromotionValidationResponse, CardPaymentProviderName } from '@ultimate-pos/shared'
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
  Gift,
  Star,
  Stars,
  Heart,
  Tag,
  Clock,
  ArrowRight,
  QrCode,
  UserPlus,
  Maximize2,
  RotateCcw,
  User,
  CreditCard,
} from 'lucide-react'
interface CartItem {
  product_id: string
  name: string
  price: number
  original_price: number
  quantity: number
  image_url?: string | null
  points?: number
  category_id?: string | null
  variant_label?: string
  modifiers: string[]
  notes: string | null
}

function cartLineKey(item: Pick<CartItem, 'product_id' | 'modifiers' | 'notes'>) {
  return `${item.product_id}|${(item.modifiers || []).join(',')}|${item.notes || ''}`
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
  const [stationProvider, setStationProvider] = useState<CardPaymentProviderName>('mercado_pago')
  const [storeSlug, setStoreSlug] = useState('')
  const [taxRate, setTaxRate] = useState(0)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxLabel, setTaxLabel] = useState('Tax')
  const [taxInclusive, setTaxInclusive] = useState(false)
  const [hasLoyalty, setHasLoyalty] = useState(false)
  const [pointsPerCurrency, setPointsPerCurrency] = useState(10)
  const [specialInstructionsEnabled, setSpecialInstructionsEnabled] = useState(true)

  // ─── Catalogue ───────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // ─── Cart ─────────────────────────────────────────────────────────────────
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [discountLabel, setDiscountLabel] = useState('')
  const [dismissedWelcome, setDismissedWelcome] = useState(false)
  const [customizeProduct, setCustomizeProduct] = useState<Product | null>(null)

  // ─── Promotions ───────────────────────────────────────────────────────────
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [appliedPromotions, setAppliedPromotions] = useState<PromotionValidationResponse['applied_promotions']>([])
  const [promoDiscount, setPromoDiscount] = useState(0)
  const promoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Promo modal ──────────────────────────────────────────────────────────
  const [showPromo, setShowPromo] = useState(false)
  const [promoInput, setPromoInput] = useState('')
  const [promoMode, setPromoMode] = useState<'percent' | 'fixed'>('percent')
  const [promoPin, setPromoPin] = useState('')
  const [showPromoPinPrompt, setShowPromoPinPrompt] = useState(false)
  const [promoPinInput, setPromoPinInput] = useState('')
  const [promoPinError, setPromoPinError] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [mobileView, setMobileView] = useState<'products' | 'cart' | 'scan' | 'customer'>('products')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registeringCustomer, setRegisteringCustomer] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(true)
  const [formExpanded, setFormExpanded] = useState(false)
  const [cameraExpanded, setCameraExpanded] = useState(true)

  // ─── Customer search ─────────────────────────────────────────────────────
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer | null | undefined>(undefined)
  const [searchingCustomer, setSearchingCustomer] = useState(false)

  // ─── Rewards ──────────────────────────────────────────────────────────────
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [redeemedRewardId, setRedeemedRewardId] = useState<string | null>(null)
  const [redeemedRewardData, setRedeemedRewardData] = useState<{
    name: string
    reward_type: string
    discount_value?: number
    discount_type?: 'percentage' | 'fixed' | null
  } | null>(null)

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
    items: { name: string; quantity: number; price: number }[]
    loyalty?: { pointsEarned: number; pointsBefore: number; pointsAfter: number }
    customerName?: string
    // optional summary fields for the success receipt
    productSavings?: number
    discount?: number
    discountLabel?: string
    promoDiscount?: number
    rewardDiscount?: number
    rewardLabel?: string
    appliedPromotions?: { promotion_id: string; name: string; discount_amount: number }[]
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
      const [verifyRes, productsRes, categoriesRes, promosRes] = await Promise.all([
        api.get<{ data: { store: { name: string; slug: string; tax_rate?: number; settings?: Record<string, unknown> }; station: { name: string; provider?: CardPaymentProviderName } } }>('/self-checkout/verify'),
        api.get<{ data: Product[] }>('/self-checkout/products'),
        api.get<{ data: ProductCategory[] }>('/self-checkout/categories'),
        api.get<{ data: Promotion[] }>('/promotions').catch(() => ({ data: [] })),
      ])

      const storeData = verifyRes.data.store
      const settings = storeData.settings as Record<string, unknown> | undefined
      setStoreName(storeData.name)
      setStoreSlug(storeData.slug)
      setStationName(verifyRes.data.station.name)
      setStationProvider(verifyRes.data.station.provider ?? getActiveCardProvider(settings))
      setTaxRate(storeData.tax_rate ? Number(storeData.tax_rate) / 100 : 0)
      setTaxEnabled((settings?.taxEnabled as boolean) ?? false)
      setTaxLabel((settings?.taxLabel as string) ?? 'Tax')
      setTaxInclusive((settings?.taxInclusive as boolean) ?? false)
      setHasLoyalty((settings?.hasLoyalty as boolean) ?? false)
      setPointsPerCurrency((settings?.pointsPerCurrency as number) ?? 10)
      setSpecialInstructionsEnabled((settings?.specialInstructionsEnabled as boolean) ?? true)
      setPromoPin((settings?.promoPin as string) ?? '')
      setProducts(productsRes.data)
      setCategories(categoriesRes.data)
      setPromotions(promosRes.data || [])
      setPageState('browsing')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading self-checkout'
      setErrorMsg(msg)
      setPageState('error')
    }
  }

  // ─── Customer search ──────────────────────────────────────────────────────
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const registerUrl = typeof window !== 'undefined' && storeSlug
    ? `${window.location.origin}/tienda/${storeSlug}/registro`
    : ''

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!customerSearchQuery.trim()) {
      setCustomerSearchResults(undefined)
      return
    }
    setSearchingCustomer(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await apiFetch<{ data: Customer | null }>(
          `/customers/lookup?code=${encodeURIComponent(customerSearchQuery.trim())}`,
        )
        setCustomerSearchResults(res.data)
      } catch (err) {
        console.error('Customer lookup error:', err)
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
    setDismissedWelcome(true)
    setRedeemedRewardId(null)
    setRedeemedRewardData(null)
    setRewards([])
    setCustomerProfile({
      customer: result.customer,
      loyalty: result.loyaltyCard,
    })
    setProfileExpanded(false)
    setQrExpanded(false)
    setFormExpanded(false)
    setCameraExpanded(false)
  }, [])

  // ─── Rewards fetching (depends on apiFetch, must be below it) ─────────────
  useEffect(() => {
    if (!customerProfile?.loyalty?.id) {
      setRewards([])
      setRedeemedRewardId(null)
      setRedeemedRewardData(null)
      return
    }
    let cancelled = false
    setRewardsLoading(true)
    apiFetch<{ data: LoyaltyReward[] }>(`/rewards/available/${customerProfile.loyalty.id}`)
      .then((res) => {
        if (!cancelled) setRewards(res.data || [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRewardsLoading(false)
      })
    return () => { cancelled = true }
  }, [customerProfile?.loyalty?.id, apiFetch])

  const handleRegisterCustomer = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!registerName.trim()) return

    setRegisteringCustomer(true)
    try {
      const res = await apiFetch<{ data: Customer }>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail.trim() || undefined,
          phone: registerPhone.trim() || undefined,
        }),
      })

      setDismissedWelcome(true)
      setCustomerProfile({ customer: res.data })
      setProfileExpanded(false)
      setQrExpanded(false)
      setFormExpanded(false)
      setCameraExpanded(false)
      setCustomerSearchQuery('')
      setCustomerSearchResults(undefined)
      setRegisterName('')
      setRegisterEmail('')
      setRegisterPhone('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error registering customer'
      setErrorMsg(msg)
    } finally {
      setRegisteringCustomer(false)
    }
  }, [registerEmail, registerName, registerPhone, apiFetch])

  // ─── Customer search → profile ──────────────────────────────────────────
  const handleSelectSearchResult = useCallback(async (customer: Customer) => {
    setCustomerSearchQuery('')
    setCustomerSearchResults(undefined)
    setLoadingProfile(true)
    setQrExpanded(false)
    setFormExpanded(false)
    setCameraExpanded(false)
    setRedeemedRewardId(null)
    setRedeemedRewardData(null)
    setRewards([])
    try {
      const json = await apiFetch<{ data: { customer: Customer; loyaltyCard: LoyaltyCardData | null; recentOrders: Array<{ id: string; order_number: number; total: number; created_at: string; items: Array<{ product_name: string; quantity: number }> }> } }>(
        `/customers/${customer.id}/detail`,
      )
      setDismissedWelcome(true)
      setCustomerProfile({
        customer: json.data.customer,
        loyalty: json.data.loyaltyCard || undefined,
        recentOrders: json.data.recentOrders,
      })
    } catch {
      setDismissedWelcome(true)
      setCustomerProfile({ customer })
    } finally {
      setLoadingProfile(false)
      setProfileExpanded(false)
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
  const filtered = products
    .filter((p) => {
      if (!p.is_active) return false
      if (selectedCategory && p.category_id !== selectedCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const cat = categories.find((c) => c.id === p.category_id)
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false) ||
          (cat?.name.toLowerCase().includes(q) ?? false)
        return (p as Product & { pinned?: boolean }).pinned || matchesSearch
      }
      return true
    })
    .sort((a, b) => {
      const pa = (a as Product & { pinned?: boolean }).pinned ?? false
      const pb = (b as Product & { pinned?: boolean }).pinned ?? false
      if (pa !== pb) return pa ? -1 : 1
      return a.name.localeCompare(b.name)
    })

  // sale subtotal (prices baked with product-level promos)
  const saleSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  // original subtotal (catalog prices) — used for display in OrderSummary
  const originalSubtotal = cartItems.reduce((sum, i) => sum + i.original_price * i.quantity, 0)
  const productSavings = cartItems.reduce((sum, i) => sum + Math.max(0, i.original_price - i.price) * i.quantity, 0)
  // actualSubtotal should represent the subtotal after product-level savings
  const actualSubtotal = originalSubtotal - productSavings
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  // Reward discount
  const rewardDiscount = redeemedRewardData?.discount_value
    ? redeemedRewardData.reward_type === 'percentage_discount' || (redeemedRewardData.reward_type === 'custom' && redeemedRewardData.discount_type === 'percentage')
      ? Math.round(actualSubtotal * (redeemedRewardData.discount_value / 100) * 100) / 100
      : redeemedRewardData.reward_type === 'fixed_discount' || (redeemedRewardData.reward_type === 'custom' && redeemedRewardData.discount_type === 'fixed')
        ? Math.min(redeemedRewardData.discount_value, actualSubtotal)
        : 0
    : 0

  // ─── Floating cart bubble totals (pre-discount so FloatingCartBar applies discounts) ──
  const cartTax = !taxEnabled ? 0 : taxInclusive
    ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
    : Math.round(actualSubtotal * taxRate * 100) / 100
  const cartTotalDiscount = discount + promoDiscount + rewardDiscount
  const cartPreDiscountTotal = taxInclusive ? actualSubtotal : actualSubtotal + cartTax

  const handleRewardSelect = (reward: LoyaltyReward) => {
    setRedeemedRewardId(reward.id)
    setRedeemedRewardData({
      name: reward.name,
      reward_type: reward.reward_type,
      discount_value: reward.discount_value ?? undefined,
      discount_type: reward.discount_type ?? undefined,
    })
  }
  const handleRewardDeselect = () => {
    setRedeemedRewardId(null)
    setRedeemedRewardData(null)
  }

  // ─── Active promotions (filtered by date) ─────────────────────────────────
  const activePromotions = promotions.filter((p) => {
    if (!p.is_active) return false
    const now = new Date()
    if (p.starts_at && new Date(p.starts_at) > now) return false
    if (p.ends_at && new Date(p.ends_at) < now) return false
    return true
  })

  function getPromotionForProduct(product: Product): Promotion | null {
    let bestPromo: Promotion | null = null
    let bestDiscount = 0
    for (const promo of activePromotions) {
      if (promo.target_type === 'product') {
        if (!promo.target_ids?.includes(product.id)) continue
      } else if (promo.target_type === 'category') {
        if (!promo.target_ids?.includes(product.category_id || '')) continue
      } else {
        continue
      }
      let discountAmount: number
      if (promo.discount_type === 'percentage') {
        discountAmount = product.price * (promo.discount_value / 100)
      } else {
        discountAmount = Math.min(promo.discount_value, product.price)
      }
      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount
        bestPromo = promo
      }
    }
    return bestPromo
  }

  // ─── Cart-level promo validation (debounced) ──────────────────────────────
  useEffect(() => {
    if (promoTimerRef.current) clearTimeout(promoTimerRef.current)
    if (cartItems.length === 0) {
      setAppliedPromotions([])
      setPromoDiscount(0)
      return
    }
    promoTimerRef.current = setTimeout(async () => {
      try {
        const validationItems = cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.original_price,
          category_id: item.category_id ?? null,
        }))
        const validationSubtotal = cartItems.reduce((sum, i) => sum + i.original_price * i.quantity, 0)
        const res = await apiFetch<{ data: PromotionValidationResponse }>('/promotions/validate', {
          method: 'POST',
          body: JSON.stringify({ items: validationItems, subtotal: validationSubtotal }),
        })
        setAppliedPromotions(res.data.applied_promotions || [])
        setPromoDiscount(res.data.total_discount || 0)
      } catch {
        // Silent fail
      }
    }, 300)
    return () => { if (promoTimerRef.current) clearTimeout(promoTimerRef.current) }
  }, [cartItems, apiFetch])

  // ─── Cart mutations ───────────────────────────────────────────────────────
  function handleAdd(product: Product) {
    setDismissedWelcome(true)
    setQrExpanded(false)
    setFormExpanded(false)
    setCameraExpanded(false)
    if (product.modifiers && product.modifiers.length > 0) {
      setCustomizeProduct(product)
      return
    }
    const promo = getPromotionForProduct(product)
    const salePrice = promo
      ? promo.discount_type === 'percentage'
        ? Math.round(product.price * (1 - promo.discount_value / 100) * 100) / 100
        : Math.max(0, Math.round((product.price - promo.discount_value) * 100) / 100)
      : Number(product.price)
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
          price: salePrice,
          original_price: Number(product.price),
          quantity: 1,
          image_url: product.image_url,
          points: product.points ?? undefined,
          category_id: product.category_id ?? null,
          variant_label: '',
          modifiers: [],
          notes: null,
        },
      ]
    })
  }

  function handleCustomizeConfirm(result: {
    quantity: number
    modifiers: string[]
    variant_label: string
    notes: string | null
    price: number
    original_price: number
  }) {
    const product = customizeProduct
    if (!product) return
    setCustomizeProduct(null)
    setCartItems((prev) => {
      const existing = prev.find((i) => cartLineKey(i) === cartLineKey({
        product_id: product.id,
        modifiers: result.modifiers,
        notes: result.notes,
      }))
      if (existing) {
        return prev.map((i) =>
          cartLineKey(i) === cartLineKey({ product_id: product.id, modifiers: result.modifiers, notes: result.notes })
            ? { ...i, quantity: i.quantity + result.quantity }
            : i,
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: result.price,
          original_price: result.original_price,
          quantity: result.quantity,
          image_url: product.image_url,
          points: product.points ?? undefined,
          category_id: product.category_id ?? null,
          variant_label: result.variant_label,
          modifiers: result.modifiers,
          notes: result.notes,
        },
      ]
    })
  }

  function handleQuantityChange(lineKey: string, qty: number) {
    if (qty === 0) {
      setCartItems((prev) => prev.filter((i) => cartLineKey(i) !== lineKey))
    } else {
      setCartItems((prev) =>
        prev.map((i) => (cartLineKey(i) === lineKey ? { ...i, quantity: qty } : i)),
      )
    }
  }

  function handleClearCart() {
    setCartItems([])
    setDiscount(0)
    setDiscountLabel('')
    setAppliedPromotions([])
    setPromoDiscount(0)
    setRedeemedRewardId(null)
    setRedeemedRewardData(null)
  }

  function handleResetAll() {
    setCartItems([])
    setDiscount(0)
    setDiscountLabel('')
    setAppliedPromotions([])
    setPromoDiscount(0)
    setShowPromo(false)
    setPromoInput('')
    setCustomerProfile(null)
    setProfileExpanded(false)
    setCustomerSearchQuery('')
    setCustomerSearchResults(undefined)
    setSearchingCustomer(false)
    setDismissedWelcome(false)
    setQrExpanded(true)
    setFormExpanded(false)
    setCameraExpanded(true)
    setRedeemedRewardId(null)
    setRedeemedRewardData(null)
    setRewards([])
    setCustomizeProduct(null)
  }

  // ─── Promo ────────────────────────────────────────────────────────────────
  function applyPromo() {
    const val = parseFloat(promoInput)
    if (!val || val <= 0) return
    if (promoMode === 'percent') {
      const amount = Math.round(saleSubtotal * (val / 100) * 100) / 100
      setDiscount(amount)
      setDiscountLabel(`${val}% Off`)
    } else {
      const amount = Math.min(val, saleSubtotal)
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
      const json = await apiFetch<{ data: { id: string; metadata?: unknown } }>(
        '/orders',
        {
          method: 'POST',
        body: JSON.stringify({
          items: cartItems.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.price,
            modifiers: i.modifiers,
            notes: i.notes,
          })),
            customer_id: customerProfile?.customer.id || undefined,
            discount: discount > 0 ? discount : undefined,
            discount_label: discount > 0 ? discountLabel : undefined,
            promo_discount: promoDiscount > 0 ? promoDiscount : undefined,
            applied_promotions: appliedPromotions.length > 0
              ? appliedPromotions.map((p) => ({
                  promotion_id: p.promotion_id,
                  name: p.name,
                  discount_amount: p.discount_amount,
                }))
              : undefined,
            redeemed_reward_id: redeemedRewardId || undefined,
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

  function handlePaid(loyalty?: { pointsEarned: number; pointsBefore: number; pointsAfter: number }) {
    const totalDiscount = discount + promoDiscount + rewardDiscount
    const tax = !taxEnabled ? 0 : taxInclusive
      ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
      : Math.round(actualSubtotal * taxRate * 100) / 100
    const finalTotal = taxInclusive
      ? Math.round((actualSubtotal - totalDiscount) * 100) / 100
      : Math.round((actualSubtotal + tax - totalDiscount) * 100) / 100
    setLastOrder({
      total: finalTotal,
      items: cartItems.map((i) => ({ name: i.variant_label ? `${i.name} (${i.variant_label})` : i.name, quantity: i.quantity, price: i.price })),
      productSavings,
      discount,
      discountLabel,
      promoDiscount,
      rewardDiscount: rewardDiscount > 0 ? rewardDiscount : undefined,
      rewardLabel: redeemedRewardData?.name || undefined,
      appliedPromotions,
      loyalty,
      customerName: customerProfile?.customer?.name,
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
    setRedeemedRewardId(null)
    setRedeemedRewardData(null)
    setLastOrder(null)
    setQrExpanded(true)
    setCameraExpanded(true)
    setCustomizeProduct(null)
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
    const loyalty = lastOrder?.loyalty
    const hasLoyaltyData = loyalty && loyalty.pointsEarned > 0
    const customerName = lastOrder?.customerName

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
        {/* Animated success glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-28 animate-pulse rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent ring-1 ring-primary/30 shadow-[0_0_40px_rgba(204,255,0,0.15)]">
            <CheckCircle2 className="h-10 w-10 text-primary drop-shadow-[0_0_8px_rgba(204,255,0,0.4)]" />
          </div>
        </div>

        <h2 className="text-2xl font-headline font-black text-on-surface">
          {customerName ? `¡Gracias, ${customerName}!` : '¡Pago exitoso!'}
        </h2>
        <p className="mt-1.5 text-sm text-on-surface-variant">
          {hasLoyaltyData
            ? `Ganaste ${loyalty.pointsEarned} puntos de lealtad`
            : 'Tu pedido ha sido registrado'}
        </p>

        {/* Premium receipt card */}
        <div className="mt-8 w-full max-w-sm overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container/60 backdrop-blur-sm">
          {/* Receipt header */}
          <div className="border-b border-outline-variant/40 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">Resumen de compra</p>
                <p className="text-[10px] text-on-surface-variant/60">{storeName}</p>
              </div>
            </div>
          </div>

          {/* Items list + compact summary */}
          <div className="px-5 py-3.5">
            <div className="space-y-2.5">
              {lastOrder?.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-[11px] font-bold text-on-surface-variant">
                    {item.quantity}x
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">{item.name}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">x{item.quantity} @ {formatCurrency(item.price)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-headline font-bold text-on-surface">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}

              {/* Summary lines: subtotal, product savings, promotions, manual discount */}
              {lastOrder && (
                (() => {
                  const itemsTotal = lastOrder.items.reduce((s, it) => s + it.price * it.quantity, 0)
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm text-on-surface-variant mt-2">
                        <span>Subtotal</span>
                        <span className="font-headline font-bold">{formatCurrency(itemsTotal)}</span>
                      </div>

                      {lastOrder.productSavings !== undefined && lastOrder.productSavings > 0 && (
                        <div className="flex items-center justify-between text-sm text-on-surface-variant">
                          <span className="text-on-surface-variant">Ahorro en productos</span>
                          <span className="font-headline font-bold text-rose-500">-{formatCurrency(lastOrder.productSavings ?? 0)}</span>
                        </div>
                      )}

                      {lastOrder.appliedPromotions && lastOrder.appliedPromotions.length > 0 && (
                        lastOrder.appliedPromotions
                          .filter((p) => (p.discount_amount ?? 0) > 0)
                          .map((p) => (
                            <div key={p.promotion_id} className="flex items-center justify-between text-sm text-on-surface-variant">
                              <span>{p.name}</span>
                              <span className="font-headline font-bold text-rose-500">-{formatCurrency(p.discount_amount ?? 0)}</span>
                            </div>
                          ))
                      )}

                      {lastOrder.promoDiscount !== undefined && lastOrder.promoDiscount > 0 && (!lastOrder.appliedPromotions || lastOrder.appliedPromotions.length === 0) && (
                        <div className="flex items-center justify-between text-sm text-on-surface-variant">
                          <span>{lastOrder.discountLabel || 'Promoción'}</span>
                          <span className="font-headline font-bold text-rose-500">-{formatCurrency(lastOrder.promoDiscount ?? 0)}</span>
                        </div>
                      )}

                      {lastOrder.discount !== undefined && lastOrder.discount > 0 && (
                        <div className="flex items-center justify-between text-sm text-on-surface-variant">
                          <span>{lastOrder.discountLabel || 'Descuento'}</span>
                          <span className="font-headline font-bold text-rose-500">-{formatCurrency(lastOrder.discount ?? 0)}</span>
                        </div>
                      )}

                      {lastOrder.rewardDiscount !== undefined && lastOrder.rewardDiscount > 0 && (
                        <div className="flex items-center justify-between text-sm text-secondary">
                          <span className="flex items-center gap-1">
                            <Gift className="h-3.5 w-3.5" />
                            {lastOrder.rewardLabel || 'Reward'}
                          </span>
                          <span className="font-headline font-bold">-{formatCurrency(lastOrder.rewardDiscount)}</span>
                        </div>
                      )}
                    </>
                  )
                })()
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-dashed border-outline-variant/50" />

          {/* Total */}
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-label font-bold text-on-surface-variant">Total</span>
              <span className="text-xl font-headline font-black text-primary">
                {formatCurrency(lastOrder?.total ?? 0)}
              </span>
            </div>
          </div>

          {/* Payment method badge */}
          <div className="border-t border-outline-variant/40 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-label font-bold text-on-surface">Pago con {cardProviderDisplayName(stationProvider)}</p>
                <p className="text-[10px] text-on-surface-variant">{stationName}</p>
              </div>
            </div>
          </div>

          {/* Loyalty points section */}
          {hasLoyaltyData && (
            <>
              <div className="mx-5 border-t border-outline-variant/40" />
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3.5 ring-1 ring-primary/20">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 shadow-[0_0_12px_rgba(204,255,0,0.15)]">
                    <Stars className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
                      Puntos de lealtad
                    </p>
                    <p className="mt-0.5 text-lg font-headline font-black text-primary">
                      {loyalty.pointsBefore} → {loyalty.pointsAfter}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-label font-bold text-primary">
                      +{loyalty.pointsEarned}
                    </p>
                    <p className="text-[10px] text-on-surface-variant">ganados</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* New order button */}
        <button
          onClick={handleNewOrder}
          className="mt-8 flex items-center gap-2.5 rounded-2xl bg-primary px-10 py-4 text-sm font-label font-bold text-primary-on shadow-[0_8px_32px_rgba(204,255,0,0.2)] transition-all hover:shadow-[0_12px_40px_rgba(204,255,0,0.3)] active:scale-[0.97]"
        >
          <RotateCcw className="h-4 w-4" />
          Nuevo pedido
        </button>
      </div>
    )
  }

  // ─── Main POS-style layout ────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden overflow-x-hidden bg-background">
      {/* ── LEFT: Products ─────────────────────────────────────────── */}
      <div className={`flex flex-1 flex-col overflow-hidden relative ${mobileView !== 'products' ? 'max-lg:hidden' : ''}`}>
        {/* Store header */}
        <header className="shrink-0 border-b border-outline-variant/50 bg-surface-container/80 px-4 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h1 className="text-base font-headline font-bold text-on-surface leading-tight">
                {storeName}
              </h1>
              <p className="text-xs text-on-surface-variant">{stationName}</p>
            </div>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 rounded-xl bg-error/10 px-3 py-1.5 text-xs font-label font-bold text-error hover:bg-error/20 transition-colors"
              title="Reiniciar todo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Comenzar de Cero
            </button>
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

        {/* Products grid or welcome hero */}
        <div className="flex-1 overflow-y-auto px-3 pb-40 lg:pb-6">
          {!customerProfile && cartItems.length === 0 && !dismissedWelcome ? (
            <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
                </div>
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-amber-400/10 to-primary/5 ring-1 ring-primary/30">
                  <Star className="h-9 w-9 text-primary" />
                </div>
              </div>

              <h1 className="text-3xl font-headline font-black text-on-surface leading-tight">
                ¡Bienvenido!
              </h1>
              <p className="mt-3 max-w-xs text-sm text-on-surface-variant leading-relaxed">
                Escanea el QR para registrarte.
                <br />
                ¿Ya tienes tu tarjeta de lealtad? Escanéala arriba para <span className="font-bold text-primary">ganar puntos y descuentos</span>.
              </p>

              <button
                onClick={() => { setDismissedWelcome(true); setQrExpanded(false); setFormExpanded(false); setCameraExpanded(false) }}
                className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-label font-bold text-primary-on transition-transform active:scale-[0.98] hover:bg-primary/90"
              >
                <ShoppingBag className="h-4 w-4" />
                Continuar como invitado sin beneficios
              </button>

              <p className="mt-4 text-[11px] text-on-surface-variant/50">
                o escanea el código QR en la barra lateral para registrarte
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-on-surface-variant/30" />
              <p className="text-sm text-on-surface-variant">No se encontraron productos</p>
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
            >
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={handleAdd}
                  variant="dense"
                  activePromotion={getPromotionForProduct(product)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile cart floating bubble (same as POS FloatingCartBar) */}
        {mobileView === 'products' && (
          <FloatingCartBar
            count={cartCount}
            total={cartPreDiscountTotal}
            discount={cartTotalDiscount}
            onCheckout={() => setMobileView('cart')}
          />
        )}

      </div>

      {/* ── RIGHT: Cart sidebar ─────────────────────────────────────── */}
      <div className={`flex w-full shrink-0 flex-col border-l border-outline-variant/50 bg-surface-container/30 lg:w-[360px] overflow-y-auto pb-20 lg:pb-0 ${mobileView !== 'cart' ? 'max-lg:hidden' : ''}`}>

        {/* Mobile back button */}
        <div className="shrink-0 lg:hidden border-b border-outline-variant/50">
          <button
            onClick={() => setMobileView('products')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-label font-bold text-on-surface-variant hover:text-on-surface transition-colors w-full"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Seguir comprando
          </button>
        </div>

        {/* QR collapsible section — desktop only */}
        <div className="hidden lg:block">
          <CollapsibleSection
            title="Registrate Escane AQUI"
            expanded={qrExpanded}
            onToggle={() => setQrExpanded((v) => !v)}
            icon={<QrCode className="h-3.5 w-3.5" />}
          >
            <div className="flex flex-col items-center p-3">
              <div className="w-full max-w-[180px] p-0.5 rounded-2xl bg-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                {registerUrl ? (
                  <QRCodeSVG
                    value={registerUrl}
                    size={180}
                    style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block', margin: '0 auto' }}
                    bgColor="#fff"
                    fgColor="#222"
                  />
                ) : (
                  <div className="flex h-[160px] w-[160px] items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant mx-auto">
                    <QrCode className="h-12 w-12" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="mt-2 flex items-center justify-center gap-1 text-[10px] font-label font-bold text-on-surface-variant hover:text-primary transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
                Ampliar QR
              </button>
              <p className="mt-2 text-xs text-on-surface-variant text-center">
                Escanea el código QR para REGISTRARTE
              </p>
              <p className="mt-2 text-xs text-on-surface-variant text-center">
                y recibir grandes descuentos!
              </p>
            </div>
          </CollapsibleSection>
        </div>

        {/* Form collapsible section — desktop only */}
        <div className="hidden lg:block">
          <CollapsibleSection
            title="Registro"
            expanded={formExpanded}
            onToggle={() => setFormExpanded((v) => !v)}
            icon={<UserPlus className="h-3.5 w-3.5" />}
          >
            <div className="p-3">
              <form onSubmit={handleRegisterCustomer} className="space-y-2">
                <div>
                  <label className="mb-1 block text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Tu nombre"
                    className="h-9 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="Email"
                    className="h-9 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <input
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    placeholder="Teléfono"
                    className="h-9 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!registerName.trim() || registeringCustomer}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-label font-bold text-primary-on transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {registeringCustomer ? 'Registrando...' : 'Guardar cliente'}
                </button>
              </form>
            </div>
          </CollapsibleSection>
        </div>

        {/* Camera collapsible section — desktop only */}
        <div className="hidden lg:block">
          <CollapsibleSection
            title="Escanea tu Tarjeta de Lealtad"
            expanded={cameraExpanded}
            onToggle={() => setCameraExpanded((v) => !v)}
            icon={<Scan className="h-3.5 w-3.5" />}
          >
            <QRScannerPopover
              open={cameraExpanded}
              onClose={() => setCameraExpanded(false)}
              variant="inline"
              onScan={handleScan}
              onScanSuccess={handleScanSuccess}
            />
          </CollapsibleSection>
        </div>

        {/* Re-expand buttons (when sections are collapsed) — desktop only */}
        {(!qrExpanded || !formExpanded || !cameraExpanded) && (
          <div className="hidden lg:flex gap-2 px-4 py-2.5 border-b border-outline-variant/50 bg-surface-container/20">
            {!qrExpanded && (
              <button
                type="button"
                onClick={() => setQrExpanded(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 py-1.5 text-[11px] font-label font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <QrCode className="h-3.5 w-3.5" />
                QR
              </button>
            )}
            {!formExpanded && (
              <button
                type="button"
                onClick={() => setFormExpanded(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 py-1.5 text-[11px] font-label font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Registro
              </button>
            )}
            {!cameraExpanded && (
              <button
                type="button"
                onClick={() => setCameraExpanded(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 py-1.5 text-[11px] font-label font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Scan className="h-3.5 w-3.5" />
                Escáner
              </button>
            )}
          </div>
        )}

        {/* Customer section — desktop only */}
        <div className="hidden lg:block shrink-0 border-b border-outline-variant/50">
          <div className="px-4 py-3">
            {!customerProfile ? (
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
                  onClick={() => setCameraExpanded(true)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                  title="Escanear tarjeta de lealtad"
                >
                  <Scan className="h-4 w-4" />
                </button>

                {customerSearchQuery && !searchingCustomer && (
                  <div className="mt-2">
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
                  </div>
                )}

                {searchingCustomer && (
                  <p className="mt-2 text-xs text-on-surface-variant">Buscando...</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-sm font-headline font-bold text-on-surface">
                    {customerProfile.customer.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate font-headline font-bold text-sm text-on-surface">
                        {customerProfile.customer.name}
                      </p>
                      {customerProfile.loyalty?.tier && (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider ${customerProfile.loyalty.tier === 'platinum' ? 'bg-primary/20 text-primary' :
                          customerProfile.loyalty.tier === 'gold' ? 'bg-amber-400/20 text-amber-400' :
                            customerProfile.loyalty.tier === 'silver' ? 'bg-slate-400/20 text-slate-300' :
                              'bg-orange-600/20 text-orange-400'
                          }`}>
                          {customerProfile.loyalty.tier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <Star className="h-3 w-3 text-primary" />
                      <span className="font-label font-bold">{customerProfile.loyalty?.points || 0} pts</span>
                      <span className="text-outline-variant">·</span>
                      <span>{customerProfile.customer.total_visits} visits</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setProfileExpanded((v) => !v)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${profileExpanded
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
                      setQrExpanded(true)
                      setCameraExpanded(true)
                      setRedeemedRewardId(null)
                      setRedeemedRewardData(null)
                      setRewards([])
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Expanded details */}
                <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${profileExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}>
                  <div className="overflow-hidden">
                    <div className="space-y-2 pt-3">
                      {/* Contact info */}
                      <div className="space-y-1 text-xs text-on-surface-variant bg-surface-container/40 rounded-xl px-3 py-2">
                        {customerProfile.customer.email && (
                          <p className="flex items-center gap-2">
                            <span className="font-medium">Email:</span>
                            <span className="truncate">{maskEmail(customerProfile.customer.email)}</span>
                          </p>
                        )}
                        {customerProfile.customer.phone && (
                          <p className="flex items-center gap-2">
                            <span className="font-medium">Phone:</span>
                            <span className="truncate">{maskPhone(customerProfile.customer.phone)}</span>
                          </p>
                        )}
                      </div>

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
            )}
          </div>
        </div>

        {/* Rewards — desktop only */}
        {customerProfile?.loyalty?.id && (rewards.length > 0 || rewardsLoading) && (
          <div className="hidden lg:block shrink-0 border-b border-outline-variant/50 px-4 py-3">
            <RewardsPanel
              rewards={rewards}
              loading={rewardsLoading}
              points={customerProfile.loyalty?.points ?? 0}
              selectedRewardId={redeemedRewardId}
              onSelect={handleRewardSelect}
              onDeselect={handleRewardDeselect}
            />
          </div>
        )}

        {/* Rewards — mobile (cart) */}
        {customerProfile?.loyalty?.id && (rewards.length > 0 || rewardsLoading) && (
          <div className="hidden max-lg:block shrink-0 border-b border-outline-variant/50 px-4 py-3">
            <RewardsPanel
              rewards={rewards}
              loading={rewardsLoading}
              points={customerProfile.loyalty?.points ?? 0}
              selectedRewardId={redeemedRewardId}
              onSelect={handleRewardSelect}
              onDeselect={handleRewardDeselect}
            />
          </div>
        )}

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
                  key={cartLineKey(item)}
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  hasLoyalty={hasLoyalty}
                  pointsPerCurrency={pointsPerCurrency}
                />
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="shrink-0 border-t border-outline-variant/50 px-4 py-3">
          <OrderSummary
            subtotal={cartItems.reduce((sum, i) => sum + i.original_price * i.quantity, 0)}
            discount={discount}
            discountLabel={discountLabel}
            appliedPromotions={appliedPromotions}
            promoDiscount={promoDiscount}
            productSavings={productSavings}
            taxRate={taxRate}
            taxLabel={taxLabel}
            taxInclusive={taxInclusive}
            taxEnabled={taxEnabled}
          />
          {rewardDiscount > 0 && (
            <div className="flex justify-between text-sm text-secondary mt-1.5">
              <span className="flex items-center gap-1">
                <Gift className="h-3.5 w-3.5" />
                {redeemedRewardData?.name || 'Reward'}
              </span>
              <span>-{formatCurrency(rewardDiscount)}</span>
            </div>
          )}
        </div>

        {/* Total row (large) */}
        <div className="shrink-0 border-t border-outline-variant/50 px-4 py-3">
          {(() => {
            // use originalSubtotal (catalog prices) and productSavings to compute actualSubtotal
            const actualSubtotal = cartItems.reduce((sum, i) => sum + i.original_price * i.quantity, 0) - productSavings
            const totalDiscount = discount + promoDiscount + rewardDiscount
            const tax = !taxEnabled ? 0 : taxInclusive
              ? Math.round((actualSubtotal - actualSubtotal / (1 + taxRate)) * 100) / 100
              : Math.round(actualSubtotal * taxRate * 100) / 100
            const finalTotal = taxInclusive
              ? Math.round((actualSubtotal - totalDiscount) * 100) / 100
              : Math.round((actualSubtotal + tax - totalDiscount) * 100) / 100
            return (
              <div className="flex items-center justify-between">
                <span className="font-label font-bold text-sm text-on-surface-variant">Total</span>
                <span className="font-headline font-bold text-xl text-primary">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            )
          })()}
        </div>

        {/* Footer buttons */}
        <div className="shrink-0 border-t border-outline-variant/50 p-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (promoPin) {
                  setPromoPinInput('')
                  setPromoPinError('')
                  setShowPromoPinPrompt(true)
                } else {
                  setShowPromo(true)
                }
              }}
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
              Nuevo pedido
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

      {/* ── Mobile: Customer view (full screen on mobile) ────────── */}
      {mobileView === 'customer' && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background pt-14 pb-16 lg:hidden">
          <div className="flex items-center justify-between border-b border-outline-variant/50 px-4 py-3">
            <h2 className="font-headline font-bold text-base text-on-surface">Mi Cuenta</h2>
            <button
              onClick={() => setMobileView('products')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {!customerProfile ? (
                <div className="space-y-5">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value)
                        if (!e.target.value) setCustomerSearchResults(undefined)
                      }}
                      placeholder="Buscar por nombre, email o teléfono..."
                      className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  {searchingCustomer && (
                    <div className="flex items-center justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {customerSearchQuery && !searchingCustomer && customerSearchResults && (
                    <button
                      onClick={() => handleSelectSearchResult(customerSearchResults)}
                      className="flex w-full items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container/60 px-4 py-3 hover:bg-surface-container transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-bold text-on-surface">
                        {customerSearchResults.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate font-label font-bold text-sm text-on-surface">{customerSearchResults.name}</p>
                        <p className="truncate text-xs text-on-surface-variant">{customerSearchResults.email || customerSearchResults.phone || ''}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-on-surface-variant" />
                    </button>
                  )}
                  {customerSearchQuery && !searchingCustomer && customerSearchResults === null && (
                    <p className="text-center text-sm text-on-surface-variant py-4">No se encontró cliente</p>
                  )}

                  {/* QR Code for registration */}
                  <div className="flex flex-col items-center gap-3 border-t border-outline-variant/30 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">O escanea el QR para registrarte</p>
                    <div className="w-full max-w-[200px] p-1 rounded-2xl bg-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                      {registerUrl ? (
                        <QRCodeSVG
                          value={registerUrl}
                          size={200}
                          style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block', margin: '0 auto' }}
                          bgColor="#fff"
                          fgColor="#222"
                        />
                      ) : (
                        <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant mx-auto">
                          <QrCode className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQRModal(true)}
                      className="flex items-center justify-center gap-1 text-xs font-label font-bold text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Ampliar QR
                    </button>
                  </div>

                  {/* Registration form */}
                  <div className="border-t border-outline-variant/30 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 text-center">Registro rápido</p>
                    <form onSubmit={handleRegisterCustomer} className="space-y-2">
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Tu nombre"
                        className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="email"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="Email"
                          className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <input
                          type="tel"
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          placeholder="Teléfono"
                          className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!registerName.trim() || registeringCustomer}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-label font-bold text-primary-on transition-colors hover:bg-primary/90 disabled:opacity-50"
                      >
                        {registeringCustomer ? 'Registrando...' : 'Crear cuenta'}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-highest text-lg font-headline font-bold text-on-surface">
                      {customerProfile.customer.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-headline font-bold text-base text-on-surface">{customerProfile.customer.name}</p>
                        {customerProfile.loyalty?.tier && (
                          <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-label font-bold capitalize text-primary">
                            {customerProfile.loyalty.tier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <Star className="h-3 w-3 text-primary" />
                        <span className="font-bold">{customerProfile.loyalty?.points || 0} pts</span>
                        <span>·</span>
                        <span>{customerProfile.customer.total_visits} visitas</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCustomerProfile(null)
                        setCustomerSearchQuery('')
                        setCustomerSearchResults(undefined)
                        setRedeemedRewardId(null)
                        setRedeemedRewardData(null)
                        setRewards([])
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                      <Star className="mx-auto mb-1 h-4 w-4 text-primary" />
                      <p className="text-sm font-bold text-on-surface">{customerProfile.loyalty?.points || 0}</p>
                      <p className="text-[10px] text-on-surface-variant">Puntos</p>
                    </div>
                    <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                      <ShoppingBag className="mx-auto mb-1 h-4 w-4 text-secondary" />
                      <p className="text-sm font-bold text-on-surface">${Number(customerProfile.customer.total_spent || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-on-surface-variant">Gastado</p>
                    </div>
                    <div className="rounded-xl bg-surface-container/60 border border-outline-variant/50 p-3 text-center">
                      <Tag className="mx-auto mb-1 h-4 w-4 text-tertiary" />
                      <p className="text-sm font-bold text-on-surface">{customerProfile.customer.total_visits}</p>
                      <p className="text-[10px] text-on-surface-variant">Visitas</p>
                    </div>
                  </div>

                  {/* Rewards — mobile */}
                  {customerProfile.loyalty?.id && (rewards.length > 0 || rewardsLoading) && (
                    <div className="border-t border-outline-variant/30 pt-4">
                      <RewardsPanel
                        rewards={rewards}
                        loading={rewardsLoading}
                        points={customerProfile.loyalty?.points ?? 0}
                        selectedRewardId={redeemedRewardId}
                        onSelect={handleRewardSelect}
                        onDeselect={handleRewardDeselect}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Scan view (full screen on mobile) ────────────── */}
      {mobileView === 'scan' && (
        <div className="fixed inset-0 z-30 flex flex-col bg-background pt-14 pb-16 lg:hidden">
          <div className="flex items-center justify-between border-b border-outline-variant/50 px-4 py-3">
            <h2 className="font-headline font-bold text-base text-on-surface">Escanear Tarjeta</h2>
            <button
              onClick={() => setMobileView('products')}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center gap-4 p-4">
              <p className="text-sm text-on-surface-variant text-center">
                Coloca el código QR frente a la cámara
              </p>
              <div className="w-full max-w-sm">
                <QRScannerPopover
                  open={mobileView === 'scan'}
                  onClose={() => setMobileView('products')}
                  variant="inline"
                  onScan={handleScan}
                  onScanSuccess={handleScanSuccess}
                />
              </div>
              <p className="text-xs text-on-surface-variant/50 text-center">
                Escanea tu tarjeta de lealtad para ganar puntos y descuentos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ───────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-outline-variant bg-surface-container-low backdrop-blur-glass lg:hidden">
        {([
          { id: 'products' as const, label: 'Productos', icon: ShoppingBag },
          { id: 'cart' as const, label: 'Carrito', icon: ShoppingCart },
          { id: 'scan' as const, label: 'Escanear', icon: Scan },
          { id: 'customer' as const, label: 'Cliente', icon: User },
        ]).map((tab) => {
          const Icon = tab.icon
          const isActive = mobileView === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setMobileView(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-label font-bold transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
              {tab.id === 'cart' && cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-on">
                  {cartCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* ── QR expand modal ──────────────────────────────────────────── */}
      {showQRModal && registerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="relative rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface shadow-lg hover:bg-surface-container-high transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <QRCodeSVG
              value={registerUrl}
              size={280}
              bgColor="#fff"
              fgColor="#222"
              style={{ borderRadius: 16, display: 'block', margin: '0 auto' }}
            />
          </div>
        </div>
      )}

      {/* ── Promo PIN prompt ────────────────────────────────────────── */}
      {showPromoPinPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xs rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface">Código de descuento</h3>
              <button
                onClick={() => { setShowPromoPinPrompt(false); setPromoPinInput(''); setPromoPinError('') }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">Ingresa el código para aplicar un descuento</p>
            <input
              type="password"
              maxLength={6}
              value={promoPinInput}
              onChange={(e) => { setPromoPinInput(e.target.value); setPromoPinError('') }}
              placeholder="••••"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-center text-xl font-headline tracking-[0.3em] text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              autoFocus
            />
            {promoPinError && (
              <p className="text-xs text-error text-center">{promoPinError}</p>
            )}
            <button
              onClick={() => {
                if (promoPinInput === promoPin) {
                  setShowPromoPinPrompt(false)
                  setPromoPinInput('')
                  setShowPromo(true)
                } else {
                  setPromoPinError('Código incorrecto')
                }
              }}
              disabled={!promoPinInput}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-label font-bold text-primary-on disabled:opacity-40 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

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
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-label font-bold transition-colors ${promoMode === 'percent'
                  ? 'bg-primary text-primary-on'
                  : 'text-on-surface-variant hover:text-on-surface'
                  }`}
              >
                % Porcentaje
              </button>
              <button
                onClick={() => setPromoMode('fixed')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-label font-bold transition-colors ${promoMode === 'fixed'
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
        // show total including product savings and cart-level promo discount
        total={
          taxInclusive
            ? Math.round((actualSubtotal - (discount + promoDiscount + rewardDiscount)) * 100) / 100
            : Math.round((actualSubtotal * (1 + (taxEnabled ? taxRate : 0)) - (discount + promoDiscount + rewardDiscount)) * 100) / 100
        }
        onPaid={handlePaid}
        onCancel={handlePaymentCancel}
        providerName={stationProvider}
        fetchOrder={(id) => apiFetch<any>(`/orders/${id}`)}
      />

      {/* ── Customize product modal (variants & extras) ─────────────── */}
      {customizeProduct && (
        <SelfCheckoutCustomizeProduct
          product={customizeProduct}
          promotion={getPromotionForProduct(customizeProduct)}
          specialInstructionsEnabled={specialInstructionsEnabled}
          onConfirm={handleCustomizeConfirm}
          onClose={() => setCustomizeProduct(null)}
        />
      )}
    </div>
  )
}

// ─── Masking helpers ─────────────────────────────────────────────────────────
function maskEmail(v: string) {
  const [local, domain] = v.split('@')
  if (!domain) return v
  const show = Math.min(local.length, 2)
  return local.slice(0, show) + '******@' + domain
}

function maskPhone(v: string) {
  const digits = v.replace(/\D/g, '')
  if (digits.length <= 4) return digits.slice(0, 1) + '****'
  const prefix = v.startsWith('+') ? 3 : 2
  return v.slice(0, prefix) + '****' + v.slice(-4)
}

// ─── Inline cart item row (no Redux dependency) ──────────────────────────────
interface SelfCheckoutCartRowProps {
  item: CartItem
  onQuantityChange: (lineKey: string, qty: number) => void
  hasLoyalty?: boolean
  pointsPerCurrency?: number
}

function SelfCheckoutCartRow({ item, onQuantityChange, hasLoyalty: hl, pointsPerCurrency: ppc }: SelfCheckoutCartRowProps) {
  const [imgError, setImgError] = useState(false)
  const imageUrl =
    item.image_url && !imgError
      ? (proxyImageUrl(item.image_url) ?? item.image_url)
      : null

  const productPoints = item.points ?? 0
  const itemPoints = hl
    ? productPoints > 0
      ? productPoints * item.quantity
      : Math.floor(item.price * (ppc ?? 10)) * item.quantity
    : 0

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
        {item.variant_label && (
          <p className="truncate text-xs text-on-surface-variant mt-0.5">{item.variant_label}</p>
        )}
        {item.notes && (
          <p className="truncate text-xs text-on-surface-variant/70 mt-0.5">{item.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          {item.original_price > item.price ? (
            <>
              <p className="line-through text-xs text-on-surface-variant/50">{formatCurrency(item.original_price)}</p>
              <p className="font-headline font-bold text-sm text-primary">{formatCurrency(item.price)}</p>
            </>
          ) : (
            <p className="font-headline font-bold text-sm text-primary">{formatCurrency(item.price)}</p>
          )}
          {itemPoints > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              <Star className="h-2.5 w-2.5 fill-primary" />
              {itemPoints}
            </span>
          )}
        </div>
      </div>
      <QuantityStepper
        value={item.quantity}
        onChange={(qty) => onQuantityChange(cartLineKey(item), qty)}
      />
    </div>
  )
}
