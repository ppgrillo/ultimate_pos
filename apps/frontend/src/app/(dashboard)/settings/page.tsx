'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useCancelQueuedMpOrdersMutation, useGetCurrentStoreQuery, useLazyGetTerminalsQuery, useSetupPdvMutation, useUpdateStoreSettingsMutation, useSyncGoogleWalletClassMutation } from '@/store/api'
import { Save, Check, X, Banknote, CreditCard, Building, CookingPot, Smartphone, List, AlertCircle, ImageIcon, ExternalLink, Store, Globe, RefreshCw, Copy } from 'lucide-react'

import { ImageUpload } from '@/components/products/ImageUpload'
import { cn } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/image-proxy'
import { api } from '@/lib/api/client'
import { getActiveCardProvider } from '@/lib/card-payments'
import type { CardPaymentProviderName } from '@ultimate-pos/shared'
import { SelfCheckoutSettings } from './SelfCheckoutSettings'
import { SubscriptionStatus } from '@/components/billing/SubscriptionStatus'
import type { KitchenWorkflowConfig, KitchenWorkflowStepStatus } from '@ultimate-pos/shared'
import { resolveKitchenWorkflow } from '@ultimate-pos/shared'
import { setStore } from '@/store/slices/storeSlice'

const isStepRequired = (status: KitchenWorkflowStepStatus) => status === 'pending' || status === 'served' || status === 'paid'

const isOptionalKitchenStep = (status: KitchenWorkflowStepStatus) => status === 'preparing' || status === 'ready'

export default function SettingsPage() {
  const dispatch = useAppDispatch()
  const currentStore = useAppSelector((s) => s.storeConfig.currentStore)
  const settings = currentStore?.settings
  const taxRate = currentStore?.tax_rate

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
  const [checkoutMode, setCheckoutMode] = useState<'order-only' | 'payment-required' | 'order-first-pay-later'>('order-only')
  const [kitchenWorkflow, setKitchenWorkflow] = useState<KitchenWorkflowConfig>(resolveKitchenWorkflow())
  const [cashEnabled, setCashEnabled] = useState(true)
  const [cardEnabled, setCardEnabled] = useState(true)
  const [transferEnabled, setTransferEnabled] = useState(true)
  const [mpPointEnabled, setMpPointEnabled] = useState(false)
  const [mpPointTerminalId, setMpPointTerminalId] = useState('')
  const [mpPointAccessToken, setMpPointAccessToken] = useState('')
  const [mpClientSecret, setMpClientSecret] = useState('')
  const [activeCardProvider, setActiveCardProvider] = useState<CardPaymentProviderName>('mercado_pago')
  const [clipEnabled, setClipEnabled] = useState(false)
  const [clipTerminalId, setClipTerminalId] = useState('')
  const [clipApiKey, setClipApiKey] = useState('')
  const [clipApiSecret, setClipApiSecret] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [terminals, setTerminals] = useState<Array<{ id: string; model: string; operating_mode: string }> | null>(null)
  const [listingTerminals, setListingTerminals] = useState(false)
  const [listError, setListError] = useState('')
  const [settingUpPdv, setSettingUpPdv] = useState<string | null>(null)
  const [cancellingMpOrder, setCancellingMpOrder] = useState(false)
  const [cancelMpMessage, setCancelMpMessage] = useState('')
  const [cancelMpSuccess, setCancelMpSuccess] = useState(false)
  const [interestsEnabled, setInterestsEnabled] = useState(true)
  const [interestsSectionTitle, setInterestsSectionTitle] = useState('Tus gustos e intereses')
  const [interestsSectionDescription, setInterestsSectionDescription] = useState('Ayúdanos a conocerte mejor para enviarte ofertas personalizadas')
  const [interestsFieldLabel, setInterestsFieldLabel] = useState('Categorías de interés')
  const [interestsPlaceholder, setInterestsPlaceholder] = useState('ropa, electrónica, hogar, mascotas...')
  const [interestsHintText, setInterestsHintText] = useState('Ej: moda, tecnología, deportes, cocina, viajes')
  const [pointsPerCurrency, setPointsPerCurrency] = useState(1)
  const [currencyUnit, setCurrencyUnit] = useState('points')
  const [signupBonusPoints, setSignupBonusPoints] = useState(0)
  const [pointsExpirationDays, setPointsExpirationDays] = useState(0)
  const [promoPin, setPromoPin] = useState('')

  const [mounted, setMounted] = useState(false)
  const [registrationUrl, setRegistrationUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)
  useEffect(() => {
    setMounted(true)
    if (currentStore?.slug) {
      setRegistrationUrl(`${window.location.origin}/tienda/${currentStore.slug}/registro`)
    }
  }, [currentStore?.slug])
  const [walletPassDesignHexColor, setWalletPassDesignHexColor] = useState('#1F1F1F')
  const [walletPassDesignLogoImageUrl, setWalletPassDesignLogoImageUrl] = useState('')
  const [walletPassDesignLogoText, setWalletPassDesignLogoText] = useState('')
  const [designIssuerName, setDesignIssuerName] = useState('')
  const [designProgramName, setDesignProgramName] = useState('')
  const [designPointsLabel, setDesignPointsLabel] = useState('PUNTOS')
  const [designTierLabel, setDesignTierLabel] = useState('NIVEL')
  const [designDefaultTier, setDesignDefaultTier] = useState('BRONCE')
  const [designSecondaryTierEnabled, setDesignSecondaryTierEnabled] = useState(false)
  const [designSecondaryTierLabel, setDesignSecondaryTierLabel] = useState('')
  const [designSecondaryTierValue, setDesignSecondaryTierValue] = useState('')
  const [designMemberIdLabel, setDesignMemberIdLabel] = useState('ID MIEMBRO')
  const [designMemberNameLabel, setDesignMemberNameLabel] = useState('MIEMBRO')
  const [designBarcodeType, setDesignBarcodeType] = useState('QR_CODE')
  const [designFoilShimmer, setDesignFoilShimmer] = useState(false)
  const [designPromotions, setDesignPromotions] = useState('')
  const [designHomepageUrl, setDesignHomepageUrl] = useState('')
  const [designContactEmail, setDesignContactEmail] = useState('')
  const [designContactPhone, setDesignContactPhone] = useState('')
  const [designContactWebsite, setDesignContactWebsite] = useState('')
  const [designHeroImageUrl, setDesignHeroImageUrl] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')
  const [timezone, setTimezone] = useState('America/Mexico_City')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [activeTab, setActiveTab] = useState('store')
  const { refetch: refetchStore } = useGetCurrentStoreQuery()
  const [triggerTerminals] = useLazyGetTerminalsQuery()
  const [updateStoreSettings, { isLoading: settingsLoading }] = useUpdateStoreSettingsMutation()
  const [setupPdv] = useSetupPdvMutation()
  const [cancelQueuedMpOrders] = useCancelQueuedMpOrdersMutation()
  const [syncGoogleWalletClass, { isLoading: syncingGoogleClass, isSuccess: googleClassSynced, isError: googleClassError }] = useSyncGoogleWalletClassMutation()

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
    setKitchenWorkflow(resolveKitchenWorkflow(settings?.kitchenWorkflow))
    const methods = settings?.acceptedPaymentMethods ?? ['cash', 'card', 'transfer']
    setCashEnabled(methods.includes('cash'))
    setCardEnabled(methods.includes('card'))
    setTransferEnabled(methods.includes('transfer'))
    setMpPointEnabled(settings?.mpPointEnabled ?? false)
    setMpPointTerminalId(settings?.mpPointTerminalId ?? '')
    setActiveCardProvider(getActiveCardProvider(settings))
    setClipEnabled(settings?.clipEnabled ?? false)
    setClipTerminalId(settings?.clipTerminalId ?? '')
    const ic = settings?.registrationInterestsConfig
    setInterestsEnabled(ic?.enabled ?? true)
    setInterestsSectionTitle(ic?.sectionTitle ?? 'Tus gustos e intereses')
    setInterestsSectionDescription(ic?.sectionDescription ?? 'Ayúdanos a conocerte mejor para enviarte ofertas personalizadas')
    setInterestsFieldLabel(ic?.fieldLabel ?? 'Categorías de interés')
    setInterestsPlaceholder(ic?.placeholder ?? 'ropa, electrónica, hogar, mascotas...')
    setInterestsHintText(ic?.hintText ?? 'Ej: moda, tecnología, deportes, cocina, viajes')
    setPointsPerCurrency((settings?.pointsPerCurrency as number) ?? 1)
    setCurrencyUnit((settings?.currencyUnit as string) ?? 'points')
    setSignupBonusPoints((settings?.signupBonusPoints as number) ?? 0)
    setPointsExpirationDays((settings?.pointsExpirationDays as number) ?? 0)
    setPromoPin((settings?.promoPin as string) ?? '')

    const design = (settings?.walletPassDesign as Record<string, unknown>) || {}
    setWalletPassDesignHexColor((design?.hexColor as string) ?? '#1F1F1F')
    setWalletPassDesignLogoImageUrl((design?.logoImageUrl as string) ?? '')
    setWalletPassDesignLogoText((design?.logoText as string) ?? '')
    setDesignIssuerName((design?.issuerName as string) ?? '')
    setDesignProgramName((design?.programName as string) ?? '')
    setDesignPointsLabel((design?.pointsLabel as string) ?? 'PUNTOS')
    setDesignTierLabel((design?.tierLabel as string) ?? 'NIVEL')
    setDesignDefaultTier((design?.defaultTier as string) ?? 'BRONCE')
    setDesignSecondaryTierEnabled(!!(design?.secondaryTierEnabled))
    setDesignSecondaryTierLabel((design?.secondaryTierLabel as string) ?? '')
    setDesignSecondaryTierValue((design?.secondaryTierValue as string) ?? '')
    setDesignMemberIdLabel((design?.memberIdLabel as string) ?? 'ID MIEMBRO')
    setDesignMemberNameLabel((design?.memberNameLabel as string) ?? 'MIEMBRO')
    setDesignBarcodeType((design?.barcodeType as string) ?? 'QR_CODE')
    setDesignFoilShimmer(!!(design?.foilShimmer))
    setDesignPromotions((design?.promotions as string) ?? '')
    setDesignHomepageUrl((design?.homepageUrl as string) ?? '')
    setDesignContactEmail((design?.contactEmail as string) ?? '')
    setDesignContactPhone((design?.contactPhone as string) ?? '')
    setDesignContactWebsite((design?.contactWebsite as string) ?? '')
    setDesignHeroImageUrl((design?.heroImageUrl as string) ?? '')
    setBusinessAddress((settings?.address as string) ?? '')
    setTimezone((settings?.timezone as string) ?? 'America/Mexico_City')
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
    JSON.stringify(kitchenWorkflow) !== JSON.stringify(resolveKitchenWorkflow(settings?.kitchenWorkflow)) ||
    JSON.stringify(enabledMethods) !== JSON.stringify(currentMethods) ||
    mpPointEnabled !== (settings?.mpPointEnabled ?? false) ||
    mpPointTerminalId !== (settings?.mpPointTerminalId ?? '') ||
    mpPointAccessToken !== '' ||
    mpClientSecret !== '' ||
    activeCardProvider !== getActiveCardProvider(settings) ||
    clipEnabled !== (settings?.clipEnabled ?? false) ||
    clipTerminalId !== (settings?.clipTerminalId ?? '') ||
    clipApiKey !== '' ||
    clipApiSecret !== '' ||
    interestsEnabled !== (settings?.registrationInterestsConfig?.enabled ?? true) ||
    interestsSectionTitle !== (settings?.registrationInterestsConfig?.sectionTitle ?? 'Tus gustos e intereses') ||
    interestsSectionDescription !== (settings?.registrationInterestsConfig?.sectionDescription ?? 'Ayúdanos a conocerte mejor para enviarte ofertas personalizadas') ||
    interestsFieldLabel !== (settings?.registrationInterestsConfig?.fieldLabel ?? 'Categorías de interés') ||
    interestsPlaceholder !== (settings?.registrationInterestsConfig?.placeholder ?? 'ropa, electrónica, hogar, mascotas...') ||
    interestsHintText !== (settings?.registrationInterestsConfig?.hintText ?? 'Ej: moda, tecnología, deportes, cocina, viajes') ||
    pointsPerCurrency !== ((settings?.pointsPerCurrency as number) ?? 1) ||
    currencyUnit !== ((settings?.currencyUnit as string) ?? 'points') ||
    signupBonusPoints !== ((settings?.signupBonusPoints as number) ?? 0) ||
    pointsExpirationDays !== ((settings?.pointsExpirationDays as number) ?? 0) ||
    promoPin !== ((settings?.promoPin as string) ?? '') ||
    timezone !== ((settings?.timezone as string) ?? 'America/Mexico_City') ||

    walletPassDesignHexColor !== (((settings?.walletPassDesign as Record<string, unknown>)?.hexColor as string) ?? '#1F1F1F') ||
    walletPassDesignLogoImageUrl !== (((settings?.walletPassDesign as Record<string, unknown>)?.logoImageUrl as string) ?? '') ||
    walletPassDesignLogoText !== (((settings?.walletPassDesign as Record<string, unknown>)?.logoText as string) ?? '') ||
    designIssuerName !== (((settings?.walletPassDesign as Record<string, unknown>)?.issuerName as string) ?? '') ||
    designProgramName !== (((settings?.walletPassDesign as Record<string, unknown>)?.programName as string) ?? '') ||
    designPointsLabel !== (((settings?.walletPassDesign as Record<string, unknown>)?.pointsLabel as string) ?? 'PUNTOS') ||
    designTierLabel !== (((settings?.walletPassDesign as Record<string, unknown>)?.tierLabel as string) ?? 'NIVEL') ||
    designDefaultTier !== (((settings?.walletPassDesign as Record<string, unknown>)?.defaultTier as string) ?? 'BRONCE') ||
    designSecondaryTierEnabled !== !!((settings?.walletPassDesign as Record<string, unknown>)?.secondaryTierEnabled) ||
    designSecondaryTierLabel !== (((settings?.walletPassDesign as Record<string, unknown>)?.secondaryTierLabel as string) ?? '') ||
    designSecondaryTierValue !== (((settings?.walletPassDesign as Record<string, unknown>)?.secondaryTierValue as string) ?? '') ||
    designMemberIdLabel !== (((settings?.walletPassDesign as Record<string, unknown>)?.memberIdLabel as string) ?? 'ID MIEMBRO') ||
    designMemberNameLabel !== (((settings?.walletPassDesign as Record<string, unknown>)?.memberNameLabel as string) ?? 'MIEMBRO') ||
    designBarcodeType !== (((settings?.walletPassDesign as Record<string, unknown>)?.barcodeType as string) ?? 'QR_CODE') ||
    designFoilShimmer !== !!((settings?.walletPassDesign as Record<string, unknown>)?.foilShimmer) ||
    designPromotions !== (((settings?.walletPassDesign as Record<string, unknown>)?.promotions as string) ?? '') ||
    designHomepageUrl !== (((settings?.walletPassDesign as Record<string, unknown>)?.homepageUrl as string) ?? '') ||
    designContactEmail !== (((settings?.walletPassDesign as Record<string, unknown>)?.contactEmail as string) ?? '') ||
    designContactPhone !== (((settings?.walletPassDesign as Record<string, unknown>)?.contactPhone as string) ?? '') ||
    designContactWebsite !== (((settings?.walletPassDesign as Record<string, unknown>)?.contactWebsite as string) ?? '') ||
    designHeroImageUrl !== (((settings?.walletPassDesign as Record<string, unknown>)?.heroImageUrl as string) ?? '') ||
    businessAddress !== ((settings?.address as string) ?? '')

  const updateWorkflowStep = (
    status: KitchenWorkflowStepStatus,
    patch: Partial<KitchenWorkflowConfig[number]>,
  ) => {
    setKitchenWorkflow((prev) => prev.map((step) => {
      if (step.status !== status) return step
      const next = { ...step, ...patch }
      if (isStepRequired(status)) {
        next.enabled = true
      }
      return next
    }))
  }

  const handleSave = async (overrides?: { mpPointTerminalId?: string; clipTerminalId?: string }) => {
    try {
      await updateStoreSettings({
        address: businessAddress || undefined,
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
        kitchenWorkflow,
        acceptedPaymentMethods: enabledMethods,
        mpPointEnabled,
        mpPointTerminalId: overrides?.mpPointTerminalId ?? mpPointTerminalId,
        activeCardProvider,
        clipEnabled,
        clipTerminalId: overrides?.clipTerminalId ?? clipTerminalId,
        ...(mpPointAccessToken ? { mpPointAccessToken } : {}),
        ...(mpClientSecret ? { mpClientSecret } : {}),
        ...(clipApiKey ? { clipApiKey } : {}),
        ...(clipApiSecret ? { clipApiSecret } : {}),
        registrationInterestsConfig: {
          enabled: interestsEnabled,
          sectionTitle: interestsSectionTitle,
          sectionDescription: interestsSectionDescription,
          fieldLabel: interestsFieldLabel,
          placeholder: interestsPlaceholder,
          hintText: interestsHintText,
        },
        pointsPerCurrency,
        currencyUnit,
        signupBonusPoints,
        pointsExpirationDays,
        promoPin: promoPin || undefined,
        timezone,

        name: designIssuerName,
        walletPassDesign: {
          hexColor: walletPassDesignHexColor,
          logoImageUrl: walletPassDesignLogoImageUrl,
          logoText: walletPassDesignLogoText,
          heroImageUrl: designHeroImageUrl,
          issuerName: designIssuerName,
          programName: designProgramName,
          pointsLabel: designPointsLabel,
          tierLabel: designTierLabel,
          defaultTier: designDefaultTier,
          secondaryTierEnabled: designSecondaryTierEnabled,
          secondaryTierLabel: designSecondaryTierLabel,
          secondaryTierValue: designSecondaryTierValue,
          memberIdLabel: designMemberIdLabel,
          memberNameLabel: designMemberNameLabel,
          barcodeType: designBarcodeType,
          foilShimmer: designFoilShimmer,
          promotions: designPromotions,
          homepageUrl: designHomepageUrl,
          contactEmail: designContactEmail,
          contactPhone: designContactPhone,
          contactWebsite: designContactWebsite,
        },
      }).unwrap()

      const normalizedWorkflow = resolveKitchenWorkflow(kitchenWorkflow)
      setKitchenWorkflow(normalizedWorkflow)
      const refreshed = await refetchStore()
      if (refreshed.data) {
        dispatch(setStore(refreshed.data))
      }
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
      const result = await triggerTerminals({ provider: activeCardProvider }).unwrap()
      setTerminals(result.terminals ?? [])
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
      await setupPdv({ terminalId, provider: activeCardProvider }).unwrap()
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
      const result = await cancelQueuedMpOrders({ provider: activeCardProvider }).unwrap()
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await api.upload<{ url: string }>('/stores/upload-logo', formData)
      setWalletPassDesignLogoImageUrl(result.url)
    } catch {
      console.error('Logo upload failed')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="checkout">Checkout</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="self-checkout">Self-Checkout</TabsTrigger>
        </TabsList>
        <TabsContent value="store">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Store Timezone</CardTitle>
                <CardDescription>All reports, analytics, and order timestamps use this timezone</CardDescription>
              </CardHeader>
              <CardContent>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full max-w-md rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <optgroup label="Americas">
                    <option value="America/Mexico_City">Mexico City (UTC-6)</option>
                    <option value="America/Tijuana">Tijuana (UTC-8)</option>
                    <option value="America/Cancun">Cancun (UTC-5)</option>
                    <option value="America/Bogota">Bogota (UTC-5)</option>
                    <option value="America/Lima">Lima (UTC-5)</option>
                    <option value="America/Santiago">Santiago (UTC-4)</option>
                    <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
                    <option value="America/Sao_Paulo">Sao Paulo (UTC-3)</option>
                    <option value="America/New_York">New York (UTC-5)</option>
                    <option value="America/Chicago">Chicago (UTC-6)</option>
                    <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
                    <option value="America/Denver">Denver (UTC-7)</option>
                    <option value="Pacific/Honolulu">Honolulu (UTC-10)</option>
                  </optgroup>
                  <optgroup label="Europe & Africa">
                    <option value="Europe/London">London (UTC+0)</option>
                    <option value="Europe/Paris">Paris (UTC+1)</option>
                    <option value="Europe/Berlin">Berlin (UTC+1)</option>
                    <option value="Europe/Madrid">Madrid (UTC+1)</option>
                    <option value="Europe/Rome">Rome (UTC+1)</option>
                    <option value="Africa/Lagos">Lagos (UTC+1)</option>
                    <option value="Africa/Johannesburg">Johannesburg (UTC+2)</option>
                  </optgroup>
                  <optgroup label="Asia & Oceania">
                    <option value="Asia/Dubai">Dubai (UTC+4)</option>
                    <option value="Asia/Kolkata">Kolkata (UTC+5:30)</option>
                    <option value="Asia/Bangkok">Bangkok (UTC+7)</option>
                    <option value="Asia/Shanghai">Shanghai (UTC+8)</option>
                    <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                    <option value="Australia/Sydney">Sydney (UTC+10)</option>
                  </optgroup>
                  <optgroup label="UTC">
                    <option value="UTC">UTC</option>
                  </optgroup>
                </select>
              </CardContent>
            </Card>

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

                {hasKitchen && (
                  <div className="rounded-xl border border-outline-variant/50 bg-surface-container/20 p-4">
                    <div className="mb-3">
                      <h4 className="text-sm font-bold text-on-surface">Kitchen Workflow</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Rename each step and enable/disable optional steps. Enabled steps appear in timeline and flow actions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {kitchenWorkflow.map((step) => {
                        const required = isStepRequired(step.status)

                        return (
                          <div key={step.status} className="rounded-lg border border-outline-variant/40 bg-surface-container/40 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">{step.status}</p>
                              <input
                                value={step.label}
                                onChange={(e) => updateWorkflowStep(step.status, { label: e.target.value })}
                                className="mt-1 h-9 w-full rounded-md border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50"
                                placeholder="Step label"
                              />
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                                <input
                                  type="checkbox"
                                  checked={step.enabled}
                                  disabled={required}
                                  onChange={(e) => updateWorkflowStep(step.status, { enabled: e.target.checked })}
                                  className="h-4 w-4 rounded border-outline-variant bg-surface-container text-primary"
                                />
                                Enabled
                              </label>
                              {!required && isOptionalKitchenStep(step.status) && (
                                <p className="text-[10px] text-on-surface-variant/80">
                                  Optional step in kitchen flow. Disable to skip this stage.
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registro público de clientes</CardTitle>
                <CardDescription>Comparte este enlace con tus clientes para que se registren y obtengan su tarjeta de lealtad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-label font-bold text-on-surface-variant">Slug de tu tienda</p>
                      <p className="text-sm font-mono text-on-surface truncate">{currentStore?.slug || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-label font-bold text-on-surface-variant">URL de registro</p>
                      <p className="text-sm font-mono text-on-surface truncate">
                        {mounted && registrationUrl ? registrationUrl : 'Cargando...'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!mounted || !registrationUrl}
                      onClick={() => {
                        navigator.clipboard.writeText(registrationUrl).then(() => {
                          setCopiedUrl(true)
                          setTimeout(() => setCopiedUrl(false), 2000)
                        })
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                      title="Copiar enlace"
                    >
                      {copiedUrl ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formulario de registro — Gustos e intereses</CardTitle>
                <CardDescription>Personaliza la sección de intereses que ven tus clientes al registrarse</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={interestsEnabled}
                    onChange={(e) => setInterestsEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Mostrar sección de intereses</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Cuando está desactivado, los clientes solo ven datos personales</span>
                  </div>
                </label>

                {interestsEnabled && (
                  <>
                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Título de la sección</label>
                      <input
                        value={interestsSectionTitle}
                        onChange={(e) => setInterestsSectionTitle(e.target.value)}
                        placeholder="Tus gustos e intereses"
                        className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Descripción</label>
                      <input
                        value={interestsSectionDescription}
                        onChange={(e) => setInterestsSectionDescription(e.target.value)}
                        placeholder="Ayúdanos a conocerte mejor para enviarte ofertas personalizadas"
                        className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Etiqueta del campo</label>
                        <input
                          value={interestsFieldLabel}
                          onChange={(e) => setInterestsFieldLabel(e.target.value)}
                          placeholder="Categorías de interés"
                          className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                      <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Placeholder</label>
                        <input
                          value={interestsPlaceholder}
                          onChange={(e) => setInterestsPlaceholder(e.target.value)}
                          placeholder="ropa, electrónica, hogar, mascotas..."
                          className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 space-y-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Texto de ejemplo</label>
                      <input
                        value={interestsHintText}
                        onChange={(e) => setInterestsHintText(e.target.value)}
                        placeholder="Ej: moda, tecnología, deportes, cocina, viajes"
                        className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>
                  </>
                )}
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
            {!hasKitchen && (
              <>
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
                        onClick={() => setCheckoutMode('order-first-pay-later')}
                        className={cn(
                          'flex-1 rounded-xl border p-5 text-left transition-all',
                          checkoutMode === 'order-first-pay-later'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/50 text-on-surface-variant hover:border-on-surface-variant',
                        )}
                      >
                        <span className="block text-sm font-bold">Order First, Pay Later</span>
                        <span className="block text-xs mt-1 opacity-70">Create orders now, collect payment later from the sales list</span>
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
              </>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Card Terminal Payments</CardTitle>
                <CardDescription>Accept in-person credit and debit card payments via a terminal provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Active provider
                  </label>
                  <select
                    value={activeCardProvider}
                    onChange={(e) => setActiveCardProvider(e.target.value as CardPaymentProviderName)}
                    className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="mercado_pago">Mercado Pago Point</option>
                    <option value="clip">Clip PinPad</option>
                  </select>
                  <p className="text-[10px] text-on-surface-variant/50 mt-2">
                    Your store uses this provider for all in-person card payments. Configure its credentials below.
                  </p>
                </div>

                {activeCardProvider === 'mercado_pago' && (
                <>
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
                </>)}

                {activeCardProvider === 'clip' && (
                <>
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={clipEnabled}
                    onChange={(e) => setClipEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <CreditCard className="h-5 w-5 text-on-surface-variant" />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Enable Clip PinPad</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Send card payments to a Clip PinPad / Total 3 / Ultra terminal for in-person processing</span>
                  </div>
                </label>
                </>)}

                {((activeCardProvider === 'clip' ? clipEnabled : mpPointEnabled)) && (
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
                        value={activeCardProvider === 'clip' ? clipTerminalId : mpPointTerminalId}
                        onChange={(e) => (activeCardProvider === 'clip' ? setClipTerminalId(e.target.value) : setMpPointTerminalId(e.target.value))}
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
                                  if (activeCardProvider === 'clip') {
                                    setClipTerminalId(t.id)
                                    setTerminals(null)
                                    handleSave({ clipTerminalId: t.id })
                                  } else {
                                    setMpPointTerminalId(t.id)
                                    setTerminals(null)
                                    handleSave({ mpPointTerminalId: t.id })
                                  }
                                }}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeCardProvider === 'mercado_pago' && (
                      <>
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

                        <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                            Client Secret (Webhook HMAC)
                          </label>
                          <input
                            type="password"
                            value={mpClientSecret}
                            onChange={(e) => setMpClientSecret(e.target.value)}
                            placeholder={settings?.mpPointEnabled ? 'Leave empty to keep current secret' : 'Enter your Mercado Pago client secret'}
                            className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                          />
                          <p className="text-[10px] text-on-surface-variant/50 mt-1">
                            Used to verify webhook signatures. Stored encrypted and never exposed to the frontend.
                            {settings?.mpPointEnabled && ' Leave empty to keep the existing secret.'}
                          </p>
                        </div>
                      </>
                    )}

                    {activeCardProvider === 'clip' && (
                      <>
                        <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={clipApiKey}
                            onChange={(e) => setClipApiKey(e.target.value)}
                            placeholder={settings?.clipEnabled ? 'Leave empty to keep current key' : 'Enter your Clip API key'}
                            className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                          />
                          <p className="text-[10px] text-on-surface-variant/50 mt-1">
                            Used to authenticate PinPad intents and refunds. Stored encrypted and never exposed to the frontend.
                            {settings?.clipEnabled && ' Leave empty to keep the existing key.'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                            Clave Secreta (Secret)
                          </label>
                          <input
                            type="password"
                            value={clipApiSecret}
                            onChange={(e) => setClipApiSecret(e.target.value)}
                            placeholder={settings?.clipEnabled ? 'Leave empty to keep current secret' : 'Enter your Clip secret'}
                            className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                          />
                          <p className="text-[10px] text-on-surface-variant/50 mt-1">
                            Pair of your Clip API key. Stored encrypted and never exposed to the frontend.
                            {settings?.clipEnabled && ' Leave empty to keep the existing secret.'}
                          </p>
                        </div>
                      </>
                    )}

                    {activeCardProvider === 'mercado_pago' && (
                      <>
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
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discount PIN</CardTitle>
                <CardDescription>Set a PIN for applying discounts in self-checkout — only staff who know the PIN can use it</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <label className="mb-1 block text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                    Promo PIN
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="password"
                      maxLength={6}
                      value={promoPin}
                      onChange={(e) => setPromoPin(e.target.value)}
                      placeholder="Sin PIN"
                      className="h-10 w-32 rounded-xl border border-outline-variant bg-background px-3 text-center text-lg font-headline tracking-[0.3em] text-on-surface placeholder:text-on-surface-variant/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button
                      onClick={() => setPromoPin('')}
                      className="text-xs font-label font-bold text-on-surface-variant hover:text-error transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Déjalo vacío para permitir descuentos sin PIN
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="business">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Info</CardTitle>
                <CardDescription>Your store&rsquo;s identity — name, logo, contact and location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Business Logo</label>
                  <div
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="flex items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/50 p-8 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {uploadingLogo ? (
                      <div className="text-center">
                        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-sm text-on-surface-variant mt-3">Uploading logo...</p>
                      </div>
                    ) : walletPassDesignLogoImageUrl ? (
                      <div className="relative">
                        <img src={proxyImageUrl(walletPassDesignLogoImageUrl) ?? ''} alt="Logo" className="h-24 w-24 rounded-lg object-cover border border-outline-variant/30" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setWalletPassDesignLogoImageUrl('') }}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white text-xs shadow-lg hover:bg-error/90 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 mx-auto text-on-surface-variant/40" />
                        <p className="text-sm text-on-surface-variant mt-3">Click to upload logo</p>
                        <p className="text-xs text-on-surface-variant/40 mt-1">PNG, JPEG, WebP or AVIF &middot; Max 3 MB</p>
                      </div>
                    )}
                    <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Business name</label>
                  <input type="text" value={designIssuerName} onChange={(e) => { setDesignIssuerName(e.target.value); setDesignProgramName(e.target.value) }} placeholder="My Store" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Used as the pass issuer and program name in digital wallets</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Physical address</label>
                  <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="123 Main St, City, Country" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Store location address</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-on-surface mb-4">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Email</label>
                      <input type="text" value={designContactEmail} onChange={(e) => setDesignContactEmail(e.target.value)} placeholder="hello@mystore.com" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Phone</label>
                      <input type="tel" value={designContactPhone} onChange={(e) => setDesignContactPhone(e.target.value)} placeholder="+52 555 123 4567" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Website</label>
                      <input type="text" value={designContactWebsite} onChange={(e) => setDesignContactWebsite(e.target.value)} placeholder="https://mystore.com" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="billing">
          <div className="space-y-4">
            <SubscriptionStatus />
          </div>
        </TabsContent>
        <TabsContent value="loyalty">
          <div className="space-y-6">

            {/* ── Google Wallet Sync ─────────────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <RefreshCw className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span>Google Wallet Sync</span>
                      <p className="text-xs font-normal text-on-surface-variant mt-0.5">Push design changes to all Android wallet passes</p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Flow callout */}
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-primary/[0.02] p-5">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(204,255,0,0.06),transparent_60%)]" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <div className="flex shrink-0 items-center justify-center sm:pt-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                        <RefreshCw className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-on-surface">
                        Your design changes are saved to the database, but they don&apos;t reach your users yet.
                      </p>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        <div className="flex items-center gap-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">1</div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">Design</p>
                            <p className="text-[10px] text-on-surface-variant/70">Configure above</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">2</div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">Save</p>
                            <p className="text-[10px] text-on-surface-variant/70">Store settings</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">3</div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">Push</p>
                            <p className="text-[10px] text-on-surface-variant/70">Update Google class</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                        Click the button below <strong className="text-primary">after saving</strong> to push the latest design
                        to Google. Android users get the update automatically — no action needed on their end.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sync button */}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => syncGoogleWalletClass()}
                    disabled={syncingGoogleClass}
                    className="flex items-center gap-2.5 rounded-xl bg-primary/15 border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_20px_rgba(204,255,0,0.08)] hover:shadow-[0_0_30px_rgba(204,255,0,0.15)]"
                  >
                    {syncingGoogleClass ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>
                    ) : googleClassSynced ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {syncingGoogleClass ? 'Syncing…' : googleClassSynced ? 'Class synced' : googleClassError ? 'Retry sync' : 'Push to Google Wallet'}
                  </button>
                  {googleClassError && (
                    <p className="flex items-center gap-1.5 text-xs text-error">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Sync failed — check issuer ID and service account credentials.
                    </p>
                  )}
                  <span className="text-[11px] text-on-surface-variant/50 hidden sm:inline">
                    {googleClassSynced ? 'Last push was successful' : 'Apple Wallet updates separately on download'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Info</CardTitle>
                <CardDescription>How your loyalty card appears in Google Wallet and Apple Wallet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 divide-y divide-outline-variant/20">
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Business name</span>
                    <span className="text-sm font-medium text-on-surface">{designIssuerName || <span className="text-on-surface-variant/40 italic">Not set</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Logo image</span>
                    <span className="text-sm font-medium text-on-surface">{walletPassDesignLogoImageUrl ? <span className="text-primary truncate max-w-[200px] inline-block align-middle">Uploaded</span> : <span className="text-on-surface-variant/40 italic">Not set</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Email</span>
                    <span className="text-sm font-medium text-on-surface">{designContactEmail || <span className="text-on-surface-variant/40 italic">Not set</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Phone</span>
                    <span className="text-sm font-medium text-on-surface">{designContactPhone || <span className="text-on-surface-variant/40 italic">Not set</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Website</span>
                    <span className="text-sm font-medium text-on-surface">{designContactWebsite || <span className="text-on-surface-variant/40 italic">Not set</span>}</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('business')} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  <Store className="h-3.5 w-3.5" />
                  Edit business info in Business Settings
                  <ExternalLink className="h-3 w-3" />
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earning Rules</CardTitle>
                <CardDescription>How customers earn and redeem points</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Points per currency unit</label>
                    <input type="number" min={0} step={1} value={pointsPerCurrency} onChange={(e) => setPointsPerCurrency(parseFloat(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Points earned per $1 spent</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Signup bonus</label>
                    <input type="number" min={0} step={1} value={signupBonusPoints} onChange={(e) => setSignupBonusPoints(parseInt(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Points awarded on enrollment</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Expiration (days)</label>
                    <input type="number" min={0} step={1} value={pointsExpirationDays} onChange={(e) => setPointsExpirationDays(parseInt(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">0 = no expiration</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Points label on pass</label>
                    <input type="text" value={designPointsLabel} onChange={(e) => setDesignPointsLabel(e.target.value)} placeholder="PUNTOS" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">What points are called on the wallet pass (e.g. PUNTOS, STARS)</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Points unit name (POS)</label>
                    <input type="text" value={currencyUnit} onChange={(e) => setCurrencyUnit(e.target.value)} placeholder="points" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Display name in the POS (e.g. &ldquo;points&rdquo;, &ldquo;stars&rdquo;)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branding & Design</CardTitle>
                <CardDescription>Wallet-specific visual settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Logo text (Apple Wallet)</label>
                    <input type="text" value={walletPassDesignLogoText} onChange={(e) => setWalletPassDesignLogoText(e.target.value)} placeholder="Store name" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Text shown next to the logo in Apple Wallet</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Hero image</label>
                    <ImageUpload value={designHeroImageUrl} onChange={(v) => setDesignHeroImageUrl(v ?? '')} uploadLabel="Upload Hero Image" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Banner image for the pass, ideally 1200&times;800px</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Pass background color</label>
                    <div className="flex items-center gap-3">
                      <input type="text" value={walletPassDesignHexColor} onChange={(e) => setWalletPassDesignHexColor(e.target.value)} placeholder="#1F1F1F" className="h-10 flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-outline-variant" style={{ backgroundColor: walletPassDesignHexColor }} />
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Hex color for the pass background</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <input type="checkbox" id="foilShimmer" checked={designFoilShimmer} onChange={(e) => setDesignFoilShimmer(e.target.checked)} className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary" />
                  <label htmlFor="foilShimmer" className="cursor-pointer">
                    <span className="block text-sm font-bold text-on-surface">Foil Shimmer (Google Wallet)</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Holographic shimmer animation — makes the pass stand out in Google Wallet</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tiers</CardTitle>
                <CardDescription>Loyalty levels shown on the pass</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Tier label</label>
                    <input type="text" value={designTierLabel} onChange={(e) => setDesignTierLabel(e.target.value)} placeholder="NIVEL" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">e.g. &ldquo;NIVEL&rdquo;, &ldquo;TIER&rdquo;, &ldquo;LEVEL&rdquo;</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Default tier (new members)</label>
                    <input type="text" value={designDefaultTier} onChange={(e) => setDesignDefaultTier(e.target.value)} placeholder="BRONCE" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">The tier assigned when a customer first enrolls</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <input type="checkbox" id="secTier" checked={designSecondaryTierEnabled} onChange={(e) => setDesignSecondaryTierEnabled(e.target.checked)} className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary" />
                  <label htmlFor="secTier" className="cursor-pointer">
                    <span className="block text-sm font-bold text-on-surface">Enable secondary tier</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Show a second tier field on the pass (e.g. for sub-levels)</span>
                  </label>
                </div>

                {designSecondaryTierEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Secondary tier label</label>
                      <input type="text" value={designSecondaryTierLabel} onChange={(e) => setDesignSecondaryTierLabel(e.target.value)} placeholder="NIVEL 2" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Secondary tier value</label>
                      <input type="text" value={designSecondaryTierValue} onChange={(e) => setDesignSecondaryTierValue(e.target.value)} placeholder="PLATA" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pass Layout</CardTitle>
                <CardDescription>Labels and information shown on the digital pass</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Member name label</label>
                    <input type="text" value={designMemberNameLabel} onChange={(e) => setDesignMemberNameLabel(e.target.value)} placeholder="MIEMBRO" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Member ID label</label>
                    <input type="text" value={designMemberIdLabel} onChange={(e) => setDesignMemberIdLabel(e.target.value)} placeholder="ID MIEMBRO" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Barcode type</label>
                  <select value={designBarcodeType} onChange={(e) => setDesignBarcodeType(e.target.value)} className="h-10 w-full max-w-xs rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                    <option value="QR_CODE">QR Code</option>
                    <option value="CODE_128">Code 128</option>
                    <option value="AZTEC">Aztec</option>
                    <option value="PDF_417">PDF 417</option>
                  </select>
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Used for scanning loyalty cards at checkout</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Rewards plan (shown on pass back)</label>
                  <textarea value={designPromotions} onChange={(e) => setDesignPromotions(e.target.value)} placeholder="Describe how customers earn and redeem points..." rows={3} className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Appears on the back of the pass in both wallets</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact & Links</CardTitle>
                <CardDescription>Information shown on the back of the pass</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Homepage URL</label>
                  <input type="text" value={designHomepageUrl} onChange={(e) => setDesignHomepageUrl(e.target.value)} placeholder="https://mystore.com" className="h-10 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Shown as a link on the back of the pass</p>
                </div>
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="h-4 w-4 text-on-surface-variant" />
                    <p className="text-xs text-on-surface-variant">Email: {designContactEmail || <span className="text-on-surface-variant/40 italic">Not set</span>} &middot; Phone: {designContactPhone || <span className="text-on-surface-variant/40 italic">Not set</span>} &middot; Website: {designContactWebsite || <span className="text-on-surface-variant/40 italic">Not set</span>}</p>
                  </div>
                  <button onClick={() => setActiveTab('business')} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                    <Store className="h-3.5 w-3.5" />
                    Edit contact info in Business Settings
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="self-checkout">
          <SelfCheckoutSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
