'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { updateStoreSettings } from '@/store/slices/storeSlice'
import { Save, Check, X, Banknote, CreditCard, Building, CookingPot } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const settings = useAppSelector((s) => s.storeConfig.currentStore?.settings)
  const taxRate = useAppSelector((s) => s.storeConfig.currentStore?.tax_rate)
  const settingsLoading = useAppSelector((s) => s.storeConfig.settingsLoading)

  const [hasVariants, setHasVariants] = useState(false)
  const [hasLoyalty, setHasLoyalty] = useState(false)
  const [trackInventory, setTrackInventory] = useState(false)
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [taxRateLocal, setTaxRateLocal] = useState(0)
  const [taxLabel, setTaxLabel] = useState('')
  const [taxInclusive, setTaxInclusive] = useState(false)
  const [taxExemptEnabled, setTaxExemptEnabled] = useState(false)
  const [specialInstructionsEnabled, setSpecialInstructionsEnabled] = useState(false)
  const [hasKitchen, setHasKitchen] = useState(true)
  const [checkoutMode, setCheckoutMode] = useState<'order-only' | 'payment-required'>('order-only')
  const [cashEnabled, setCashEnabled] = useState(true)
  const [cardEnabled, setCardEnabled] = useState(true)
  const [transferEnabled, setTransferEnabled] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setHasVariants(settings?.hasVariants ?? false)
    setHasLoyalty(settings?.hasLoyalty ?? false)
    setTrackInventory(settings?.trackInventory ?? false)
    setTaxEnabled(settings?.taxEnabled ?? false)
    setTaxRateLocal(taxRate ?? 0)
    setTaxLabel(settings?.taxLabel ?? '')
    setTaxInclusive(settings?.taxInclusive ?? false)
    setTaxExemptEnabled(settings?.taxExemptEnabled ?? false)
    setSpecialInstructionsEnabled(settings?.specialInstructionsEnabled ?? true)
    setHasKitchen(settings?.hasKitchen ?? true)
    setCheckoutMode(settings?.checkoutMode ?? 'order-only')
    const methods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
    setCashEnabled(methods.includes('cash'))
    setCardEnabled(methods.includes('card'))
    setTransferEnabled(methods.includes('transfer'))
  }, [settings, taxRate])

  const currentMethods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
  const enabledMethods = [
    ...(cashEnabled ? ['cash' as const] : []),
    ...(cardEnabled ? ['card' as const] : []),
    ...(transferEnabled ? ['transfer' as const] : []),
  ]

  const hasChanges =
    hasVariants !== (settings?.hasVariants ?? false) ||
    hasLoyalty !== (settings?.hasLoyalty ?? false) ||
    trackInventory !== (settings?.trackInventory ?? false) ||
    taxEnabled !== (settings?.taxEnabled ?? false) ||
    taxRateLocal !== (taxRate ?? 0) ||
    taxLabel !== (settings?.taxLabel ?? '') ||
    taxInclusive !== (settings?.taxInclusive ?? false) ||
    taxExemptEnabled !== (settings?.taxExemptEnabled ?? false) ||
    specialInstructionsEnabled !== (settings?.specialInstructionsEnabled ?? true) ||
    hasKitchen !== (settings?.hasKitchen ?? true) ||
    checkoutMode !== (settings?.checkoutMode ?? 'order-only') ||
    JSON.stringify(enabledMethods) !== JSON.stringify(currentMethods)

  const handleSave = async () => {
    try {
      await dispatch(updateStoreSettings({
        hasVariants,
        hasLoyalty,
        trackInventory,
        taxEnabled,
        taxRate: taxRateLocal,
        taxLabel,
        taxInclusive,
        taxExemptEnabled,
        specialInstructionsEnabled,
        hasKitchen,
        checkoutMode,
        acceptedPaymentMethods: enabledMethods,
      })).unwrap()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-headline-lg text-on-surface">Settings</h1>
        <div className="flex items-center gap-3">
          {error && (
            <span className="flex items-center gap-1.5 text-xs font-label font-bold text-error">
              <X className="h-4 w-4" /> Failed to save
            </span>
          )}
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-label font-bold text-primary">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || settingsLoading} isLoading={settingsLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      <Tabs defaultValue="store">
        <TabsList>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="checkout">Checkout</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
        </TabsList>
        <TabsContent value="store">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Defaults</CardTitle>
                <CardDescription>Configure default product features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Has Variants & Extras</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Add customization options like size, milk choice, or toppings</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasLoyalty}
                    onChange={(e) => setHasLoyalty(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Enable Loyalty Points</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Assign loyalty points per sale</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={trackInventory}
                    onChange={(e) => setTrackInventory(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Track Inventory</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Enable stock tracking and low-stock alerts per product</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={specialInstructionsEnabled}
                    onChange={(e) => setSpecialInstructionsEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Special Instructions</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Allow customers to add notes or special requests when customizing products</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={hasKitchen}
                    onChange={(e) => setHasKitchen(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <CookingPot className="h-5 w-5 text-on-surface-variant" />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Has Kitchen / Food Service</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Show kitchen-related messaging — disable for retail or service-based businesses</span>
                  </div>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Configuration</CardTitle>
                <CardDescription>Configure sales tax rates and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Enable Tax</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Apply sales tax to orders</span>
                  </div>
                </label>

                {taxEnabled && (
                  <>
                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={taxRateLocal}
                        onChange={(e) => setTaxRateLocal(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-none p-0 font-headline font-bold text-2xl text-on-surface focus:ring-0"
                      />
                    </div>

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Tax Label
                      </label>
                      <input
                        type="text"
                        value={taxLabel}
                        onChange={(e) => setTaxLabel(e.target.value)}
                        placeholder="e.g. IVA, VAT, Sales Tax"
                        className="w-full bg-transparent border-none p-0 font-headline font-bold text-2xl text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={taxInclusive}
                        onChange={(e) => setTaxInclusive(e.target.checked)}
                        className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="block text-sm font-bold text-on-surface">Prices include tax</span>
                        <span className="block text-xs text-on-surface-variant mt-0.5">Tax is extracted from the price rather than added on top</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={taxExemptEnabled}
                        onChange={(e) => setTaxExemptEnabled(e.target.checked)}
                        className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="block text-sm font-bold text-on-surface">Per-Product Tax Exemption</span>
                        <span className="block text-xs text-on-surface-variant mt-0.5">Allow marking individual products as tax-exempt</span>
                      </div>
                    </label>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="checkout">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Checkout Mode</CardTitle>
                <CardDescription>Control whether payment is required when completing an order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCheckoutMode('order-only')}
                    className={cn(
                      'flex-1 rounded-xl border p-5 text-left transition-all',
                      checkoutMode === 'order-only'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant/50 text-on-surface-variant hover:border-on-surface-variant',
                    )}
                  >
                    <span className="block text-sm font-bold">Order Only</span>
                    <span className="block text-xs mt-1 opacity-70">Create orders without payment — for tracking or kitchen tickets</span>
                  </button>
                  <button
                    onClick={() => setCheckoutMode('payment-required')}
                    className={cn(
                      'flex-1 rounded-xl border p-5 text-left transition-all',
                      checkoutMode === 'payment-required'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant/50 text-on-surface-variant hover:border-on-surface-variant',
                    )}
                  >
                    <span className="block text-sm font-bold">Payment Required</span>
                    <span className="block text-xs mt-1 opacity-70">Require a payment method before completing each order</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {checkoutMode === 'payment-required' && (
              <Card>
                <CardHeader>
                  <CardTitle>Accepted Payment Methods</CardTitle>
                  <CardDescription>Choose which payment methods are available at checkout</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={cashEnabled}
                      onChange={(e) => setCashEnabled(e.target.checked)}
                      className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                    />
                    <Banknote className="h-5 w-5 text-on-surface-variant" />
                    <div>
                      <span className="block text-sm font-bold text-on-surface">Cash</span>
                      <span className="block text-xs text-on-surface-variant mt-0.5">Accept cash payments</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={cardEnabled}
                      onChange={(e) => setCardEnabled(e.target.checked)}
                      className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                    />
                    <CreditCard className="h-5 w-5 text-on-surface-variant" />
                    <div>
                      <span className="block text-sm font-bold text-on-surface">Card</span>
                      <span className="block text-xs text-on-surface-variant mt-0.5">Accept credit and debit card payments</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={transferEnabled}
                      onChange={(e) => setTransferEnabled(e.target.checked)}
                      className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                    />
                    <Building className="h-5 w-5 text-on-surface-variant" />
                    <div>
                      <span className="block text-sm font-bold text-on-surface">Transfer</span>
                      <span className="block text-xs text-on-surface-variant mt-0.5">Accept bank transfers and deposits</span>
                    </div>
                  </label>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Program</CardTitle>
              <CardDescription>Configure rewards and points system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant">Loyalty settings will be built here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Digital Wallet</CardTitle>
              <CardDescription>Google Wallet & Apple Wallet integration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant">Wallet integration settings will be built here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
