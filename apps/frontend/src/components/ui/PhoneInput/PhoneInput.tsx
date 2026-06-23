'use client'

import PhoneInputComponent from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'
import type { Country, Value } from 'react-phone-number-input'

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  defaultCountry?: Country
  placeholder?: string
}

export function PhoneInput({
  value,
  onChange,
  label,
  error,
  defaultCountry = 'MX',
  placeholder = '+52 555 123 4567',
}: PhoneInputProps) {
  const inputId = label?.toLowerCase().replace(/\s+/g, '-') || 'phone'

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-label font-bold text-on-surface-variant"
        >
          {label}
        </label>
      )}
      <PhoneInputComponent
        id={inputId}
        international
        defaultCountry={defaultCountry}
        value={value || ('' as Value | undefined)}
        onChange={(v) => onChange?.(v || '')}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full items-center rounded-lg border bg-surface-container px-3 text-sm backdrop-blur-glass transition-colors',
          'focus-within:ring-2 focus-within:ring-primary',
          '[&>.PhoneInputInput]:bg-transparent',
          '[&>.PhoneInputInput]:text-on-body',
          '[&>.PhoneInputInput]:placeholder:text-on-surface-variant/50',
          '[&>.PhoneInputInput]:outline-none',
          '[&>.PhoneInputInput]:w-full',
          error ? 'border-error' : 'border-outline-variant',
        )}
        style={
          {
            '--PhoneInput-color--focus': '#ccff00',
            '--PhoneInputCountrySelectArrow-color': 'rgba(255, 255, 255, 0.5)',
            '--PhoneInputCountryFlag-borderColor': 'rgba(255, 255, 255, 0.2)',
          } as React.CSSProperties
        }
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
