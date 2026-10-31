'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useCancelQueuedMpOrdersMutation, useGetCurrentStoreQuery, useLazyGetTerminalsQuery, useSetupPdvMutation, useUpdateStoreSettingsMutation, useSyncGoogleWalletClassMutation } from '@/store/api'
import { Save, Check, X, Banknote, CreditCard, Building, Smartphone, List, AlertCircle, ImageIcon, ExternalLink, Store, Globe, RefreshCw, Copy, HandCoins, ChevronDown } from 'lucide-react'

import { ImageUpload } from '@/components/products/ImageUpload'
import { cn } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/image-proxy'
import { api } from '@/lib/api/client'
import { getActiveCardProvider } from '@/lib/card-payments'
import type { CardPaymentProviderName } from '@ultimate-pos/shared'
import { SelfCheckoutSettings } from './SelfCheckoutSettings'
import { SubscriptionStatus } from '@/components/billing/SubscriptionStatus'
import { setStore } from '@/store/slices/storeSlice'

const DEFAULT_TIP_PRESETS = [10, 15, 18, 20]
const parseTipPresets = (raw: string): number[] =>
  raw
    .split(',')
    .map((value) => parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)

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
  const [checkoutMode, setCheckoutMode] = useState<'order-only' | 'payment-required' | 'order-first-pay-later'>('order-only')
  const [cashEnabled, setCashEnabled] = useState(true)
  const [cardEnabled, setCardEnabled] = useState(true)
  const [transferEnabled, setTransferEnabled] = useState(true)
  const [mpPointEnabled, setMpPointEnabled] = useState(false)
  const [mpPointTerminalId, setMpPointTerminalId] = useState('')
  const [mpPointAccessToken, setMpPointAccessToken] = useState('')
  const [mpClientSecret, setMpClientSecret] = useState('')
  const [mpWebhookSecret, setMpWebhookSecret] = useState('')
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
  const [tipsEnabled, setTipsEnabled] = useState(false)
  const [tipLabel, setTipLabel] = useState('Tip')
  const [tipPresetsInput, setTipPresetsInput] = useState(DEFAULT_TIP_PRESETS.join(', '))
  const [tipAllowCustom, setTipAllowCustom] = useState(true)
  const [tipMaxPercent, setTipMaxPercent] = useState(100)
  const [tipAppliesTo, setTipAppliesTo] = useState<'all' | 'dine-in'>('all')

  const hydrated = useRef(false)
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
  const [activeTab, setActiveTab] = useState('general')
  const [credentialsExpanded, setCredentialsExpanded] = useState(false)
  const { refetch: refetchStore } = useGetCurrentStoreQuery()
  const [triggerTerminals] = useLazyGetTerminalsQuery()
  const [updateStoreSettings, { isLoading: settingsLoading }] = useUpdateStoreSettingsMutation()
  const [setupPdv] = useSetupPdvMutation()
  const [cancelQueuedMpOrders] = useCancelQueuedMpOrdersMutation()
  const [syncGoogleWalletClass, { isLoading: syncingGoogleClass, isSuccess: googleClassSynced, isError: googleClassError }] = useSyncGoogleWalletClassMutation()

  useEffect(() => {
    if (!settings) return
    if (hydrated.current) return
    hydrated.current = true
    setHasVariants(settings?.hasVariants ?? false)
    setHasLoyalty(settings?.hasLoyalty ?? false)
    setTrackInventory(settings?.trackInventory ?? false)
    setTaxEnabled(settings?.taxEnabled ?? false)
    setTaxRateLocal(taxRate ?? 0)
    setTaxLabel(settings?.taxLabel ?? '')
    setTaxInclusive(settings?.taxInclusive ?? false)
    setTaxExemptEnabled(settings?.taxExemptEnabled ?? false)
    setSpecialInstructionsEnabled(settings?.specialInstructionsEnabled ?? true)
    setCheckoutMode(settings?.checkoutMode ?? 'order-only')
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
    setTipsEnabled(settings?.tipsEnabled ?? false)
    setTipLabel(settings?.tipLabel ?? 'Tip')
    setTipPresetsInput((settings?.tipPresets ?? DEFAULT_TIP_PRESETS).join(', '))
    setTipAllowCustom(settings?.tipAllowCustom ?? true)
    setTipMaxPercent(settings?.tipMaxPercent ?? 100)
    setTipAppliesTo(settings?.tipAppliesTo ?? 'all')

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
    checkoutMode !== (settings?.checkoutMode ?? 'order-only') ||
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
    tipsEnabled !== (settings?.tipsEnabled ?? false) ||
    tipLabel !== (settings?.tipLabel ?? 'Tip') ||
    JSON.stringify(parseTipPresets(tipPresetsInput)) !== JSON.stringify(settings?.tipPresets ?? DEFAULT_TIP_PRESETS) ||
    tipAllowCustom !== (settings?.tipAllowCustom ?? true) ||
    tipMaxPercent !== (settings?.tipMaxPercent ?? 100) ||
    tipAppliesTo !== (settings?.tipAppliesTo ?? 'all') ||
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

  const handleSave = async () => {
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
        checkoutMode,
        acceptedPaymentMethods: enabledMethods,
        mpPointEnabled,
        mpPointTerminalId,
        activeCardProvider,
        clipEnabled,
        clipTerminalId,
        ...(mpPointAccessToken ? { mpPointAccessToken } : {}),
        ...(mpClientSecret ? { mpClientSecret } : {}),
        ...(mpWebhookSecret ? { mpWebhookSecret } : {}),
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
        tipsEnabled,
        tipLabel,
        tipPresets: parseTipPresets(tipPresetsInput),
        tipAllowCustom,
        tipMaxPercent,
        tipAppliesTo,
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

  const handleSelectTerminal = async (terminalId: string) => {
    if (activeCardProvider === 'clip') {
      setClipTerminalId(terminalId)
    } else {
      setMpPointTerminalId(terminalId)
    }
    setTerminals(null)
    try {
      const payload = activeCardProvider === 'clip'
        ? { clipTerminalId: terminalId }
        : { mpPointTerminalId: terminalId }
      await updateStoreSettings(payload).unwrap()
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
          <Button onClick={() => handleSave()} disabled={!hasChanges || settingsLoading || !settings} isLoading={settingsLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="loyalty">Lealtad</TabsTrigger>
          <TabsTrigger value="self-checkout">Self-Checkout</TabsTrigger>
          <TabsTrigger value="billing">Suscripción</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Zona horaria de la tienda</CardTitle>
                <CardDescription>Todos los reportes, análisis y marcas de tiempo usarán esta zona horaria</CardDescription>
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
                <CardTitle>Datos de la tienda</CardTitle>
                <CardDescription>Identidad de tu tienda — nombre, logo, contacto y ubicación</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Logotipo de la tienda</label>
                  <div
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="flex items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/50 p-8 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {uploadingLogo ? (
                      <div className="text-center">
                        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-sm text-on-surface-variant mt-3">Subiendo logotipo...</p>
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
                        <p className="text-sm text-on-surface-variant mt-3">Haz clic para subir logotipo</p>
                        <p className="text-xs text-on-surface-variant/40 mt-1">PNG, JPEG, WebP o AVIF · Máx 3 MB</p>
                      </div>
                    )}
                    <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Nombre de la tienda</label>
                  <input type="text" value={designIssuerName} onChange={(e) => { setDesignIssuerName(e.target.value); setDesignProgramName(e.target.value) }} placeholder="Mi Tienda" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Usado como emisor y nombre del programa en billeteras digitales</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Dirección física</label>
                  <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Calle, Ciudad, País" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Ubicación de la tienda</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-on-surface mb-4">Información de contacto</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Correo electrónico</label>
                      <input type="text" value={designContactEmail} onChange={(e) => setDesignContactEmail(e.target.value)} placeholder="hola@mitienda.com" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Teléfono</label>
                      <input type="tel" value={designContactPhone} onChange={(e) => setDesignContactPhone(e.target.value)} placeholder="+52 555 123 4567" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Sitio web</label>
                      <input type="text" value={designContactWebsite} onChange={(e) => setDesignContactWebsite(e.target.value)} placeholder="https://mitienda.com" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                    </div>
                  </div>
                </div>
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
          </div>
        </TabsContent>
        <TabsContent value="catalog">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comportamiento por defecto de productos</CardTitle>
                <CardDescription>Configura las opciones por defecto al crear productos</CardDescription>
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
                    <span className="block text-sm font-bold text-on-surface">Variantes y extras</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Permitir agregar opciones como tamaño, tipo de leche o toppings</span>
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
                    <span className="block text-sm font-bold text-on-surface">Puntos de lealtad</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Asignar puntos de lealtad por venta por defecto</span>
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
                    <span className="block text-sm font-bold text-on-surface">Control de inventario</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Habilitar seguimiento de stock y alertas de bajo inventario</span>
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
                    <span className="block text-sm font-bold text-on-surface">Instrucciones especiales</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Permitir agregar notas o solicitudes especiales al personalizar productos</span>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="sales">
          <div className="space-y-4">
            <>
                <Card>
                  <CardHeader>
                    <CardTitle>Modo de cobro</CardTitle>
                    <CardDescription>Controla si se requiere pago al completar una orden</CardDescription>
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
                        <span className="block text-sm font-bold">Solo orden</span>
                        <span className="block text-xs mt-1 opacity-70">Crear órdenes sin pago — para seguimiento o comandas</span>
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
                        <span className="block text-sm font-bold">Orden primero, pagar después</span>
                        <span className="block text-xs mt-1 opacity-70">Crear orden ahora y cobrar después desde el listado de ventas</span>
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
                        <span className="block text-sm font-bold">Pago obligatorio</span>
                        <span className="block text-xs mt-1 opacity-70">Requiere método de pago para completar cada orden</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {checkoutMode === 'payment-required' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Métodos de pago aceptados</CardTitle>
                      <CardDescription>Selecciona qué métodos de pago estarán disponibles al cobrar</CardDescription>
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
                          <span className="block text-sm font-bold text-on-surface">Efectivo</span>
                          <span className="block text-xs text-on-surface-variant mt-0.5">Aceptar pagos en efectivo</span>
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
                          <span className="block text-sm font-bold text-on-surface">Tarjeta</span>
                          <span className="block text-xs text-on-surface-variant mt-0.5">Aceptar pagos con tarjeta de crédito/débito</span>
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
                          <span className="block text-sm font-bold text-on-surface">Transferencia</span>
                          <span className="block text-xs text-on-surface-variant mt-0.5">Aceptar transferencias y depósitos bancarios</span>
                        </div>
                      </label>
                    </CardContent>
                  </Card>
                )}
            </>

            <Card>
              <CardHeader>
                <CardTitle>Pagos con terminal</CardTitle>
                <CardDescription>Acepta pagos con tarjeta presencial mediante un proveedor de terminales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Proveedor activo
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
                    Tu tienda usará este proveedor para todos los pagos con tarjeta presencial.
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
                    <span className="block text-sm font-bold text-on-surface">Habilitar MP Point</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Enviar pagos con tarjeta a una terminal Mercado Pago Point</span>
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
                    <span className="block text-sm font-bold text-on-surface">Habilitar Clip PinPad</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Enviar pagos con tarjeta a una terminal Clip</span>
                  </div>
                </label>
                </>)}

                {((activeCardProvider === 'clip' ? clipEnabled : mpPointEnabled)) && (
                  <>
                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          ID de terminal
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
                        placeholder="Selecciona una terminal de la lista"
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
                                {t.model} · {t.operating_mode}
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
                                  Configurar PDV
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectTerminal(t.id)}
                              >
                                Usar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl border border-outline-variant/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCredentialsExpanded(!credentialsExpanded)}
                        className="flex w-full items-center justify-between p-4 hover:bg-surface-container/40 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-on-surface text-left">Credenciales del proveedor</p>
                          <p className="text-xs text-on-surface-variant mt-0.5 text-left">Tokens y claves (se guardan cifrados)</p>
                        </div>
                        <ChevronDown className={cn('h-4 w-4 text-on-surface-variant transition-transform', credentialsExpanded && 'rotate-180')} />
                      </button>
                      {credentialsExpanded && (
                        <div className="p-4 pt-0 space-y-3 border-t border-outline-variant/30">
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
                                  placeholder={settings?.mpPointEnabled ? 'Dejar vacío para mantener el token actual' : 'Ingresa tu access token de Mercado Pago'}
                                  className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                                />
                                <p className="text-[10px] text-on-surface-variant/50 mt-1">
                                  Se almacena de forma segura y nunca se expone al frontend.
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
                                  placeholder={settings?.mpPointEnabled ? 'Dejar vacío para mantener el secreto actual' : 'Ingresa tu client secret'}
                                  className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                                />
                              </div>
                              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                                  Webhook Signing Secret
                                </label>
                                <input
                                  type="password"
                                  value={mpWebhookSecret}
                                  onChange={(e) => setMpWebhookSecret(e.target.value)}
                                  placeholder={settings?.mpPointEnabled ? 'Dejar vacío para mantener el secreto actual' : 'Ingresa tu webhook signing secret'}
                                  className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                                />
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
                                  placeholder={settings?.clipEnabled ? 'Dejar vacío para mantener la clave actual' : 'Ingresa tu API Key de Clip'}
                                  className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                                />
                              </div>

                              <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                                  Clave Secreta
                                </label>
                                <input
                                  type="password"
                                  value={clipApiSecret}
                                  onChange={(e) => setClipApiSecret(e.target.value)}
                                  placeholder={settings?.clipEnabled ? 'Dejar vacío para mantener el secreto actual' : 'Ingresa tu clave secreta de Clip'}
                                  className="w-full bg-transparent border-none p-0 font-mono text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

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

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
                <CardDescription>Let staff and customers add a gratuity on top of the order total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={tipsEnabled}
                    onChange={(e) => setTipsEnabled(e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                  />
                  <HandCoins className="h-5 w-5 text-on-surface-variant" />
                  <div>
                    <span className="block text-sm font-bold text-on-surface">Enable Tips</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Show a tip selector at checkout</span>
                  </div>
                </label>

                {tipsEnabled && (
                  <>
                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Tip Label
                      </label>
                      <input
                        type="text"
                        value={tipLabel}
                        onChange={(e) => setTipLabel(e.target.value)}
                        placeholder="e.g. Tip, Propina, Gratuity"
                        className="w-full bg-transparent border-none p-0 font-headline font-bold text-2xl text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                      />
                    </div>

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Preset Percentages
                      </label>
                      <input
                        type="text"
                        value={tipPresetsInput}
                        onChange={(e) => setTipPresetsInput(e.target.value)}
                        placeholder="10, 15, 18, 20"
                        className="w-full bg-transparent border-none p-0 font-headline font-bold text-2xl text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
                      />
                      <p className="mt-2 text-xs text-on-surface-variant">Comma-separated percentages shown as quick buttons</p>
                    </div>

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Maximum Tip (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={tipMaxPercent}
                        onChange={(e) => setTipMaxPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="w-full bg-transparent border-none p-0 font-headline font-bold text-2xl text-on-surface focus:ring-0"
                      />
                      <p className="mt-2 text-xs text-on-surface-variant">Cap for a custom tip percentage</p>
                    </div>

                    <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5 cursor-pointer hover:bg-surface-container/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={tipAllowCustom}
                        onChange={(e) => setTipAllowCustom(e.target.checked)}
                        className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="block text-sm font-bold text-on-surface">Allow custom amount</span>
                        <span className="block text-xs text-on-surface-variant mt-0.5">Let the operator enter any tip percentage</span>
                      </div>
                    </label>

                    <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                        Applies To
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setTipAppliesTo('all')}
                          className={cn(
                            'flex-1 rounded-xl border p-4 text-left transition-all',
                            tipAppliesTo === 'all'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-outline-variant/50 text-on-surface-variant hover:border-on-surface-variant',
                          )}
                        >
                          <span className="block text-sm font-bold">All Orders</span>
                          <span className="block text-xs mt-1 opacity-70">Offer tips on every order</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTipAppliesTo('dine-in')}
                          className={cn(
                            'flex-1 rounded-xl border p-4 text-left transition-all',
                            tipAppliesTo === 'dine-in'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-outline-variant/50 text-on-surface-variant hover:border-on-surface-variant',
                          )}
                        >
                          <span className="block text-sm font-bold">Dine-in Only</span>
                          <span className="block text-xs mt-1 opacity-70">Only for dine-in / table service</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
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
                      <span>Sincronización con Google Wallet</span>
                      <p className="text-xs font-normal text-on-surface-variant mt-0.5">Actualizar diseño de las tarjetas digitales en Android</p>
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
                        Los cambios en el diseño se guardan, pero aún no llegan a los usuarios.
                      </p>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        <div className="flex items-center gap-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">1</div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">Diseñar</p>
                            <p className="text-[10px] text-on-surface-variant/70">Configurar abajo</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">2</div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">Guardar</p>
                            <p className="text-[10px] text-on-surface-variant/70">Guardar configuración</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-surface-container/60 border border-outline-variant/30 px-3.5 py-2.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">3</div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">Sincronizar</p>
                            <p className="text-[10px] text-on-surface-variant/70">Actualizar clase Google</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-on-surface-variant/80 leading-relaxed">
                        Presiona el botón <strong className="text-primary">después de guardar</strong> para enviar los cambios a Google. Los usuarios de Android recibirán la actualización automáticamente.
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
                    {syncingGoogleClass ? 'Sincronizando...' : googleClassSynced ? 'Sincronizado' : googleClassError ? 'Reintentar' : 'Sincronizar con Google Wallet'}
                  </button>
                  {googleClassError && (
                    <p className="flex items-center gap-1.5 text-xs text-error">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Error al sincronizar — verifica credenciales.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vista previa del programa</CardTitle>
                <CardDescription>Datos que aparecerán en las tarjetas digitales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 divide-y divide-outline-variant/20">
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Nombre de la tienda</span>
                    <span className="text-sm font-medium text-on-surface">{designIssuerName || <span className="text-on-surface-variant/40 italic">Sin configurar</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Logotipo</span>
                    <span className="text-sm font-medium text-on-surface">{walletPassDesignLogoImageUrl ? <span className="text-primary">Cargado</span> : <span className="text-on-surface-variant/40 italic">Sin configurar</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Correo</span>
                    <span className="text-sm font-medium text-on-surface">{designContactEmail || <span className="text-on-surface-variant/40 italic">Sin configurar</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Teléfono</span>
                    <span className="text-sm font-medium text-on-surface">{designContactPhone || <span className="text-on-surface-variant/40 italic">Sin configurar</span>}</span>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <span className="text-xs text-on-surface-variant">Sitio web</span>
                    <span className="text-sm font-medium text-on-surface">{designContactWebsite || <span className="text-on-surface-variant/40 italic">Sin configurar</span>}</span>
                  </div>
                </div>
                <button onClick={() => setActiveTab('general')} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  <Store className="h-3.5 w-3.5" />
                  Editar datos de la tienda en General
                  <ExternalLink className="h-3 w-3" />
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reglas de acumulación</CardTitle>
                <CardDescription>Cómo se ganan y expiran los puntos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Puntos por unidad monetaria</label>
                    <input type="number" min={0} step={1} value={pointsPerCurrency} onChange={(e) => setPointsPerCurrency(parseFloat(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Puntos ganados por cada unidad gastada</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Bono de registro</label>
                    <input type="number" min={0} step={1} value={signupBonusPoints} onChange={(e) => setSignupBonusPoints(parseInt(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Puntos al registrarse</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Expiración (días)</label>
                    <input type="number" min={0} step={1} value={pointsExpirationDays} onChange={(e) => setPointsExpirationDays(parseInt(e.target.value) || 0)} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">0 = sin expiración</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Etiqueta de puntos en la tarjeta</label>
                    <input type="text" value={designPointsLabel} onChange={(e) => setDesignPointsLabel(e.target.value)} placeholder="PUNTOS" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Nombre de puntos en POS</label>
                    <input type="text" value={currencyUnit} onChange={(e) => setCurrencyUnit(e.target.value)} placeholder="puntos" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diseño de la tarjeta digital</CardTitle>
                <CardDescription>Configuración visual para Google Wallet y Apple Wallet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Texto junto al logotipo (Apple Wallet)</label>
                    <input type="text" value={walletPassDesignLogoText} onChange={(e) => setWalletPassDesignLogoText(e.target.value)} placeholder="Nombre de la tienda" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Imagen hero</label>
                    <ImageUpload value={designHeroImageUrl} onChange={(v) => setDesignHeroImageUrl(v ?? '')} uploadLabel="Subir imagen hero" />
                    <p className="text-[10px] text-on-surface-variant/60 mt-1">Recomendado 1200 × 800 px</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Color de fondo de la tarjeta</label>
                    <div className="flex items-center gap-3">
                      <input type="text" value={walletPassDesignHexColor} onChange={(e) => setWalletPassDesignHexColor(e.target.value)} placeholder="#1F1F1F" className="h-10 flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                      <div className="h-10 w-10 shrink-0 rounded-lg border border-outline-variant" style={{ backgroundColor: walletPassDesignHexColor }} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <input type="checkbox" id="foilShimmer" checked={designFoilShimmer} onChange={(e) => setDesignFoilShimmer(e.target.checked)} className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary" />
                  <label htmlFor="foilShimmer" className="cursor-pointer">
                    <span className="block text-sm font-bold text-on-surface">Efecto holográfico (Google Wallet)</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Añade brillo animado para destacar la tarjeta</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Niveles de lealtad</CardTitle>
                <CardDescription>Niveles mostrados en la tarjeta digital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Etiqueta del nivel</label>
                    <input type="text" value={designTierLabel} onChange={(e) => setDesignTierLabel(e.target.value)} placeholder="NIVEL" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Nivel por defecto (nuevos miembros)</label>
                    <input type="text" value={designDefaultTier} onChange={(e) => setDesignDefaultTier(e.target.value)} placeholder="BRONCE" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <input type="checkbox" id="secTier" checked={designSecondaryTierEnabled} onChange={(e) => setDesignSecondaryTierEnabled(e.target.checked)} className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary" />
                  <label htmlFor="secTier" className="cursor-pointer">
                    <span className="block text-sm font-bold text-on-surface">Habilitar nivel secundario</span>
                    <span className="block text-xs text-on-surface-variant mt-0.5">Mostrar un segundo campo de nivel en la tarjeta</span>
                  </label>
                </div>

                {designSecondaryTierEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-8">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Etiqueta del nivel secundario</label>
                      <input type="text" value={designSecondaryTierLabel} onChange={(e) => setDesignSecondaryTierLabel(e.target.value)} placeholder="NIVEL 2" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Valor del nivel secundario</label>
                      <input type="text" value={designSecondaryTierValue} onChange={(e) => setDesignSecondaryTierValue(e.target.value)} placeholder="PLATA" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diseño y códigos</CardTitle>
                <CardDescription>Etiquetas y elementos mostrados en la tarjeta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Etiqueta "Miembro"</label>
                    <input type="text" value={designMemberNameLabel} onChange={(e) => setDesignMemberNameLabel(e.target.value)} placeholder="MIEMBRO" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Etiqueta "ID Miembro"</label>
                    <input type="text" value={designMemberIdLabel} onChange={(e) => setDesignMemberIdLabel(e.target.value)} placeholder="ID MIEMBRO" className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Tipo de código de barras</label>
                  <select value={designBarcodeType} onChange={(e) => setDesignBarcodeType(e.target.value)} className="h-10 w-full max-w-xs rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                    <option value="QR_CODE">Código QR</option>
                    <option value="CODE_128">Code 128</option>
                    <option value="AZTEC">Aztec</option>
                    <option value="PDF_417">PDF 417</option>
                  </select>
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">Usado para escanear en caja</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Programa de recompensas (reverso de la tarjeta)</label>
                  <textarea value={designPromotions} onChange={(e) => setDesignPromotions(e.target.value)} placeholder="Describe cómo se ganan y canjean puntos..." rows={3} className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contacto y enlaces</CardTitle>
                <CardDescription>Información mostrada en el reverso de la tarjeta digital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Sitio web de la tienda</label>
                  <input type="text" value={designHomepageUrl} onChange={(e) => setDesignHomepageUrl(e.target.value)} placeholder="https://mitienda.com" className="h-10 w-full max-w-md rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 font-mono" />
                </div>
                <div className="rounded-xl bg-surface-container/30 border border-outline-variant/50 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="h-4 w-4 text-on-surface-variant" />
                    <p className="text-xs text-on-surface-variant">Correo: {designContactEmail || <span className="text-on-surface-variant/40 italic">Sin configurar</span>} · Teléfono: {designContactPhone || <span className="text-on-surface-variant/40 italic">Sin configurar</span>} · Sitio web: {designContactWebsite || <span className="text-on-surface-variant/40 italic">Sin configurar</span>}</p>
                  </div>
                  <button onClick={() => setActiveTab('general')} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                    <Store className="h-3.5 w-3.5" />
                    Editar datos de la tienda en General
                    <ExternalLink className="h-3 w-3" />
                  </button>
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
                  <button onClick={() => setActiveTab('general')} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                    <Store className="h-3.5 w-3.5" />
                    Editar datos de la tienda en General
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
