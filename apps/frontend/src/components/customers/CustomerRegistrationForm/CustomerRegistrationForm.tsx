'use client'

import { useState, useEffect } from 'react'
import type { Customer, RegistrationInterestsConfig } from '@ultimate-pos/shared'
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react'
import { FaApple } from 'react-icons/fa'
import { SiGooglepay } from 'react-icons/si'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { proxyImageUrl } from '@/lib/image-proxy'

type PageState = 'loading' | 'form' | 'success'

interface SuccessResult {
  customer: Customer
  pass?: { id: string; barcode_value?: string | null } | null
  googleSaveUrl?: string | null
}

interface StoreInfo {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  settings: {
    hasLoyalty: boolean
    registrationInterestsConfig?: RegistrationInterestsConfig
  }
}

interface Props {
  storeSlug: string
  minimal?: boolean
  onSuccess?: (result: SuccessResult) => void
}

export function CustomerRegistrationForm({
  storeSlug,
  minimal = false,
  onSuccess,
}: Props) {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [walletResult, setWalletResult] = useState<SuccessResult | null>(null)
  const [googleWalletLoading, setGoogleWalletLoading] = useState(false)
  const [googleWalletError, setGoogleWalletError] = useState<string | null>(null)

  useEffect(() => {
    if (!storeSlug) return
    fetch(`/api/public/stores/${encodeURIComponent(storeSlug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Store not found')
        return res.json()
      })
      .then((json) => {
        setStoreInfo(json.data)
        setPageState('form')
      })
      .catch(() => {
        setFetchError('Tienda no encontrada')
        setPageState('form')
      })
  }, [storeSlug])

  function handleReset() {
    setPageState('form')
    setWalletResult(null)
    setGoogleWalletError(null)
    setGoogleWalletLoading(false)
    setName('')
    setPhone('')
    setEmail('')
    setTagsInput('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !email.trim()) return
    setLoading(true)
    setError(null)

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await fetch(`/api/public/stores/${encodeURIComponent(storeSlug)}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          tags: tags.length > 0 ? tags : undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Error al registrar')
      }

      const json = await res.json()
      const result: SuccessResult = {
        customer: json.data.customer,
        pass: json.data.pass,
        googleSaveUrl: json.data.googleSaveUrl,
      }

      if (onSuccess) {
        onSuccess(result)
      } else {
        setWalletResult(result)
        setPageState('success')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-on-surface-variant">Cargando...</p>
        </div>
      </div>
    )
  }

  async function handleGoogleWallet(passId: string) {
    setGoogleWalletLoading(true)
    setGoogleWalletError(null)
    try {
      const res = await fetch(`/api/public/passes/${passId}/google-wallet-url`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Error al generar el enlace de Google Wallet')
      }
      const json = await res.json()
      const jwtUrl = json.data?.jwtUrl
      if (!jwtUrl) throw new Error('No se pudo generar el enlace')
      window.open(jwtUrl, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      setGoogleWalletError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setGoogleWalletLoading(false)
    }
  }

  if (pageState === 'success' && walletResult) {
    const passId = walletResult.pass?.id
    const applePassUrl = passId
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/wallet/apple/${passId}/download`
      : null

    const hasAnyWallet = !!(passId || googleWalletError)

    return (
      <div className="flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mt-4 text-xl font-headline font-bold text-on-surface">¡Registro exitoso!</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Tu tarjeta de lealtad está lista</p>
          </div>

          {hasAnyWallet ? (
            <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 space-y-3">
              {passId && (
                <button
                  type="button"
                  onClick={() => handleGoogleWallet(passId)}
                  disabled={googleWalletLoading}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-primary-on font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {googleWalletLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SiGooglepay className="h-4 w-4" />
                  )}
                  {googleWalletLoading ? 'Generando enlace...' : 'Guardar en Google Wallet'}
                </button>
              )}
              {googleWalletError && (
                <p className="text-xs text-error text-center">{googleWalletError}</p>
              )}
              {applePassUrl && (
                <a
                  href={applePassUrl}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm border border-outline-variant hover:bg-surface-container active:scale-[0.98] transition-all"
                >
                  <FaApple className="h-4 w-4" />
                  Descargar para Apple Wallet
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-outline-variant bg-surface-container p-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary mb-2" />
              <p className="text-sm text-on-surface-variant">
                No hay wallet digital configurada. Puedes cerrar esta página.
              </p>
            </div>
          )}

          <div className="mt-8 text-center border-t border-outline-variant/30 pt-6">
            <button
              type="button"
              onClick={handleReset}
              className="w-full h-14 rounded-xl bg-primary text-primary-on font-bold text-base hover:bg-primary/90 active:scale-[0.97] transition-all shadow-lg shadow-primary/25"
            >
              Registrar otro cliente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {fetchError ? (
        <div className="text-center py-20">
          <p className="text-lg font-headline font-bold text-on-surface">{fetchError}</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            {storeInfo?.logoUrl ? (
              <img
                src={proxyImageUrl(storeInfo.logoUrl) ?? storeInfo.logoUrl}
                alt={storeInfo.name}
                className="mx-auto max-h-16 max-w-[260px] object-contain"
              />
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
            )}
            <h1 className="mt-4 text-2xl font-headline font-bold text-on-surface">
              {storeInfo?.name || 'Mi Tienda'}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Regístrate y obtén tu tarjeta de lealtad
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-4">
              <h2 className="text-sm font-headline font-bold text-on-surface">Datos personales</h2>

              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">
                  Nombre <span className="text-error">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <PhoneInput
                value={phone}
                onChange={setPhone}
                label="Teléfono *"
                placeholder="55 1234 5678"
                defaultCountry="MX"
              />

              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">
                  Email <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  required
                  className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {!minimal && (() => {
              const ic = storeInfo?.settings?.registrationInterestsConfig
              const enabled = ic?.enabled ?? true
              if (!enabled) return null
              const sectionTitle = ic?.sectionTitle || 'Tus gustos e intereses'
              const sectionDescription = ic?.sectionDescription || 'Ayúdanos a conocerte mejor para enviarte ofertas personalizadas'
              const fieldLabel = ic?.fieldLabel || 'Categorías de interés'
              const placeholder = ic?.placeholder || 'ropa, electrónica, hogar, mascotas...'
              const hintText = ic?.hintText || 'Ej: moda, tecnología, deportes, cocina, viajes'
              return (
                <div className="rounded-2xl border border-outline-variant bg-surface-container p-5 space-y-4">
                  <h2 className="text-sm font-headline font-bold text-on-surface">{sectionTitle}</h2>
                  <p className="text-xs text-on-surface-variant -mt-2">
                    {sectionDescription}
                  </p>

                  <div>
                    <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">
                      {fieldLabel} <span className="text-on-surface-variant/50">(separadas por coma)</span>
                    </label>
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder={placeholder}
                      className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-4 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <p className="mt-1.5 text-[10px] text-on-surface-variant/70">
                      {hintText}
                    </p>
                  </div>
                </div>
              )
            })()}

            {error && (
              <div className="rounded-xl bg-error/10 border border-error/30 px-4 py-3">
                <p className="text-xs text-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !phone.trim() || !email.trim()}
              className="w-full h-12 rounded-xl bg-primary text-primary-on font-bold text-sm disabled:opacity-40 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              {loading ? 'Registrando...' : 'Registrarme y obtener tarjeta'}
            </button>

            <p className="text-center text-[10px] text-on-surface-variant/60">
              Al registrarte aceptas recibir comunicaciones de marketing personalizadas.
            </p>
          </form>
        </>
      )}
    </div>
  )
}
