'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { updateStoreSettings } from '@/store/slices/storeSlice'
import { api } from '@/lib/api/client'
import { Save, Check, X, Banknote, CreditCard, Building, CookingPot, Smartphone, List, AlertCircle, Plus, Trash2 } from 'lucide-react'
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
  const [mpPointEnabled, setMpPointEnabled] = useState(false)
  const [mpPointTerminalId, setMpPointTerminalId] = useState('')
  const [mpPointAccessToken, setMpPointAccessToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [terminals, setTerminals] = useState<Array<{ id: string; model: string; operating_mode: string }> | null>(null)
  const [listingTerminals, setListingTerminals] = useState(false)
  const [listError, setListError] = useState('')
  const [settingUpPdv, setSettingUpPdv] = useState<string | null>(null)
  const [cancellingMpOrder, setCancellingMpOrder] = useState(false)
  const [cancelMpMessage, setCancelMpMessage] = useState('')
  const [cancelMpSuccess, setCancelMpSuccess] = useState(false)
  const [preferenceFields, setPreferenceFields] = useState<Array<{ key: string; label: string; type: 'text' | 'select' | 'multiselect'; options?: string[]; placeholder?: string }>>([])

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
    setMpPointEnabled(settings?.mpPointEnabled ?? false)
    setMpPointTerminalId(settings?.mpPointTerminalId ?? '')
    setPreferenceFields(settings?.preferenceFields ?? [])
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
    JSON.stringify(enabledMethods) !== JSON.stringify(currentMethods) ||
    mpPointEnabled !== (settings?.mpPointEnabled ?? false) ||
    mpPointTerminalId !== (settings?.mpPointTerminalId ?? '') ||
    mpPointAccessToken !== '' ||
    JSON.stringify(preferenceFields) !== JSON.stringify(settings?.preferenceFields ?? [])

  const handleSave = async (overrides?: { mpPointTerminalId?: string }) => {
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
        mpPointEnabled,
        mpPointTerminalId: overrides?.mpPointTerminalId ?? mpPointTerminalId,
        ...(mpPointAccessToken ? { mpPointAccessToken } : {}),
        preferenceFields,
      })).unwrap()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError(true)
      setTimeout(() => setError(false), 3000)
    }
  }

  const handleListTerminals = async () => {
    setListingTerminals(true)
    setListError('')
    setTerminals(null)
    try {
      const result = await api.get<{ terminals: Array<{ id: string; model: string; operating_mode: string }> }>('/stores/terminals')
      setTerminals(result.terminals)
    } catch (err: any) {
      setListError(err.message || 'Failed to list terminals')
    } finally {
      setListingTerminals(false)
    }
  }

  const handleSetupPdv = async (terminalId: string) => {
    setSettingUpPdv(terminalId)
    setListError('')
    try {
      await api.post('/stores/terminals/setup-pdv', { terminalId })
      setTerminals((prev) =>
        prev
          ? prev.map((t) => (t.id === terminalId ? { ...t, operating_mode: 'PDV' } : t))
          : null,
      )
    } catch (err: any) {
      setListError(err.message || 'Failed to set PDV mode')
    } finally {
      setSettingUpPdv(null)
    }
  }

  const handleCancelQueued = async () => {
    setCancellingMpOrder(true)
    setCancelMpMessage('')
    try {
      const result = await api.post<{ cancelled: number; message?: string; errors?: string[] }>('/stores/terminals/cancel-queued')
      if (result.cancelled > 0) {
        setCancelMpMessage(`Orden cancelada exitosamente`)
        setCancelMpSuccess(true)
      } else {
        setCancelMpMessage(result.message || 'No se encontraron órdenes pendientes')
        setCancelMpSuccess(false)
      }
    } catch (err: any) {
      setCancelMpMessage(err.message || 'Error al cancelar la orden')
      setCancelMpSuccess(false)
    } finally {
      setCancellingMpOrder(false)
      setTimeout(() => { setCancelMpMessage('') }, 5000)
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
          <Button onClick={() => handleSave()} disabled={!hasChanges || settingsLoading} isLoading={settingsLoading}>
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
                <CardTitle>Customer Preferences</CardTitle>
                <CardDescription>Define what preferences your customers can have — these appear in the customer form as editable fields</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preferenceFields.map((field, idx) => (
                  <div key={idx} className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-label font-bold text-on-surface">{field.label || 'New Field'}</span>
                      <button
                        onClick={() => setPreferenceFields((prev) => prev.filter((_, i) => i !== idx))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Key</label>
                        <input
                          value={field.key}
                          onChange={(e) => {
                            const next = [...preferenceFields]
                            next[idx] = { ...next[idx], key: e.target.value }
                            setPreferenceFields(next)
                          }}
                          placeholder="e.g. clothing_style"
                          className="h-8 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Label</label>
                        <input
                          value={field.label}
                          onChange={(e) => {
                            const next = [...preferenceFields]
                            next[idx] = { ...next[idx], label: e.target.value }
                            setPreferenceFields(next)
                          }}
                          placeholder="e.g. Clothing Style"
                          className="h-8 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const next = [...preferenceFields]
                            next[idx] = { ...next[idx], type: e.target.value as 'text' | 'select' | 'multiselect' }
                            setPreferenceFields(next)
                          }}
                          className="h-8 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 text-xs text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                          <option value="text">Text</option>
                          <option value="select">Select (single)</option>
                          <option value="multiselect">Multi-select</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Placeholder</label>
                        <input
                          value={field.placeholder || ''}
                          onChange={(e) => {
                            const next = [...preferenceFields]
                            next[idx] = { ...next[idx], placeholder: e.target.value }
                            setPreferenceFields(next)
                          }}
                          placeholder="Optional"
                          className="h-8 w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                    {(field.type === 'select' || field.type === 'multiselect') && (
                      <div className="mt-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Options <span className="text-on-surface-variant/50">(one per line)</span></label>
                        <textarea
                          value={(field.options || []).join('\n')}
                          onChange={(e) => {
                            const next = [...preferenceFields]
                            next[idx] = { ...next[idx], options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }
                            setPreferenceFields(next)
                          }}
                          placeholder="Streetwear&#10;Formal&#10;Deportivo"
                          rows={3}
                          className="w-full rounded-lg border border-outline-variant bg-surface-container px-2.5 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setPreferenceFields((prev) => [...prev, { key: '', label: '', type: 'text', options: [], placeholder: '' }])}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/50 p-4 text-sm text-on-surface-variant hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Preference Field
                </button>
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

            <Card>
              <CardHeader>
                <CardTitle>Mercado Pago Point</CardTitle>
                <CardDescription>Accept credit and debit card payments via Mercado Pago Point Smart terminal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={mpPointEnabled}
                    onChange={(e) => setMpPointEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <Smartphone className="h-5 w-5 text-on-surface-variant" />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Enable MP Point</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Send card payments to a Mercado Pago Point Smart 2 terminal for in-person processing</span>
                  </div>
                </label>

                {mpPointEnabled && (
                  <>
                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          Terminal ID
                        </label>
                        <Button
                          onClick={handleListTerminals}
                          isLoading={listingTerminals}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px]"
                        >
                          <List className="h-3 w-3 mr-1" />
                          Listar
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={mpPointTerminalId}
                        onChange={(e) => setMpPointTerminalId(e.target.value)}
                        placeholder="Seleccioná una terminal de la lista"
                        className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    {listError && (
                      <div className="flex items-start gap-2 rounded-xl bg-error/10 border border-error/30 p-4">
                        <AlertCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                        <p className="text-xs text-error">{listError}</p>
                      </div>
                    )}

                    {terminals && terminals.length === 0 && (
                      <p className="text-xs text-on-surface-variant">No se encontraron terminales para esta cuenta.</p>
                    )}

                    {terminals && terminals.length > 0 && (
                      <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 divide-y divide-outline-variant/30">
                        {terminals.map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-4">
                            <div>
                              <p className="text-sm font-mono text-on-surface">{t.id}</p>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">
                                {t.model} &middot; {t.operating_mode}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {t.operating_mode === 'STANDALONE' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  isLoading={settingUpPdv === t.id}
                                  onClick={() => handleSetupPdv(t.id)}
                                  className="text-[10px]"
                                >
                                  Set PDV
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMpPointTerminalId(t.id)
                                  setTerminals(null)
                                  handleSave({ mpPointTerminalId: t.id })
                                }}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Access Token
                      </label>
                      <input
                        type="password"
                        value={mpPointAccessToken}
                        onChange={(e) => setMpPointAccessToken(e.target.value)}
                        placeholder={settings?.mpPointEnabled ? 'Leave empty to keep current token' : 'Enter your Mercado Pago access token'}
                        className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                      />
                      <p className="text-[10px] text-on-surface-variant/50 mt-1">
                        Your access token is stored securely and never exposed to the frontend.
                        {settings?.mpPointEnabled && ' Leave empty to keep the existing token.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4">
                      <div>
                        <p className="text-sm font-bold text-on-surface">Orden atorada en la terminal</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">Cancela la orden MP Point activa si no se puede crear una nueva</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        isLoading={cancellingMpOrder}
                        onClick={handleCancelQueued}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {cancelMpMessage && (
                      <p className={`text-xs ${cancelMpSuccess ? 'text-primary' : 'text-error'}`}>
                        {cancelMpMessage}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
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
