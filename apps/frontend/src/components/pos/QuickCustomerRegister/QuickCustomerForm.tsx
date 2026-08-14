'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'
import { useCreateCustomerMutation, useEnrollCustomerMutation } from '@/store/api'
import { PhoneInput } from '@/components/ui/PhoneInput'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

interface QuickCustomerFormProps {
  onCreated?: (customer: CustomerWithLoyalty, passId?: string) => void
}

export function QuickCustomerForm({ onCreated }: QuickCustomerFormProps) {
  const dispatch = useAppDispatch()
  const [createCustomer, { isLoading, error }] = useCreateCustomerMutation()
  const [enrollCustomer] = useEnrollCustomerMutation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | undefined>()
  const [tags, setTags] = useState('')

  const hasLoyalty = useAppSelector(
    (state) => state.storeConfig.currentStore?.settings?.hasLoyalty ?? false,
  )

  const interestsConfig = useAppSelector(
    (state) => state.storeConfig.currentStore?.settings?.registrationInterestsConfig,
  )
  const interestsEnabled = interestsConfig?.enabled ?? true
  const interestsLabel = interestsConfig?.fieldLabel || 'Categorías de interés'
  const interestsPlaceholder = interestsConfig?.placeholder || 'ropa, electrónica, hogar, mascotas...'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || isLoading) return

    const digits = phone.replace(/\D/g, '')
    if (phone.trim() && digits.length < 8) {
      setPhoneError('Enter a valid phone number')
      return
    }
    setPhoneError(undefined)

    const interestTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      const customer = await createCustomer({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        source: 'pos',
        tags: interestTags.length > 0 ? [...interestTags, 'pos'] : ['pos'],
        preferences: {},
        social_handles: {},
      }).unwrap()

      let passId: string | undefined
      let loyalty: { tier?: string; points?: number } | undefined

      if (hasLoyalty) {
        try {
          const result = await enrollCustomer({ customer_id: customer.id }).unwrap()
          passId = result.pass?.id
          loyalty = { tier: result.card.tier, points: result.card.points }
        } catch {
          // Enrolling is best-effort — customer creation still succeeds
        }
      }

      const customerWithLoyalty: CustomerWithLoyalty = loyalty
        ? { ...customer, loyalty }
        : customer

      dispatch(setSelectedCustomer(customerWithLoyalty))
      dispatch(setCustomer({
        id: customerWithLoyalty.id,
        name: customerWithLoyalty.name,
        tier: customerWithLoyalty.loyalty?.tier,
        points: customerWithLoyalty.loyalty?.points,
      }))

      setName('')
      setEmail('')
      setPhone('')
      setPhoneError(undefined)
      setTags('')
      onCreated?.(customerWithLoyalty, passId)
    } catch {
      // error is surfaced below via RTK Query `error`
    }
  }

  const errorMessage =
    error && 'data' in error
      ? (error.data as { message?: string } | undefined)?.message
      : undefined

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="mb-1 block text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          className="h-9 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="h-9 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
          Phone
        </label>
        <PhoneInput
          value={phone}
          onChange={(value) => {
            setPhone(value)
            setPhoneError(undefined)
          }}
          placeholder="55 1234 5678"
          defaultCountry="MX"
          error={phoneError}
        />
      </div>
      {interestsEnabled && (
        <div>
          <label className="mb-1 block text-[11px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
            {interestsLabel} <span className="font-normal normal-case text-on-surface-variant/60">(optional)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={interestsPlaceholder}
            className="h-9 w-full rounded-xl border border-outline-variant bg-background px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      )}

      {errorMessage && (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={!name.trim() || isLoading}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-label font-bold text-primary-on transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Creating...' : 'Save customer'}
      </button>
    </form>
  )
}
