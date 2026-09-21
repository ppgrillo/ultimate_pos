'use client'

import PhoneNumberInput, { type Country, type Value } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  defaultCountry?: Country
  placeholder?: string
  className?: string
}

function normalize(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '')
  if (!cleaned) return ''
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

export function PhoneInput({
  value = '',
  onChange,
  label,
  error,
  defaultCountry = 'MX',
  placeholder = '555 123 4567',
  className,
}: PhoneInputProps) {
  const inputId = label?.toLowerCase().replace(/\s+/g, '-') || 'phone'

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5"
        >
          {label}
        </label>
      )}
      <PhoneNumberInput
        id={inputId}
        value={normalize(value) || undefined}
        onChange={(next?: Value) => onChange?.(next ?? '')}
        defaultCountry={defaultCountry}
        addInternationalOption={false}
        smartCaret={false}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        countrySelectProps={{ 'aria-label': 'Country code' }}
        className={cn('rnpi', error && 'rnpi-error')}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}