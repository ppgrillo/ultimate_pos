'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const COUNTRY_CODES = [
  { code: 'MX', dial: '+52', flag: '🇲🇽' },
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'CA', dial: '+1', flag: '🇨🇦' },
  { code: 'AR', dial: '+54', flag: '🇦🇷' },
  { code: 'BR', dial: '+55', flag: '🇧🇷' },
  { code: 'CO', dial: '+57', flag: '🇨🇴' },
  { code: 'CL', dial: '+56', flag: '🇨🇱' },
  { code: 'PE', dial: '+51', flag: '🇵🇪' },
  { code: 'ES', dial: '+34', flag: '🇪🇸' },
]

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  error?: string
  defaultCountry?: string
  placeholder?: string
}

export function PhoneInput({
  value = '',
  onChange,
  label,
  error,
  defaultCountry = 'MX',
  placeholder = '555 123 4567',
}: PhoneInputProps) {
  const defaultEntry = COUNTRY_CODES.find((c) => c.code === defaultCountry) ?? COUNTRY_CODES[0]

  // Parse existing value to extract dial code and local part
  const findEntry = () => {
    for (const entry of COUNTRY_CODES) {
      if (value.startsWith(entry.dial + ' ') || value.startsWith(entry.dial)) {
        return entry
      }
    }
    return defaultEntry
  }

  const [selected, setSelected] = useState(findEntry)

  const localPart = value.startsWith(selected.dial)
    ? value.slice(selected.dial.length).replace(/^\s+/, '')
    : value

  const handleCountryChange = (code: string) => {
    const entry = COUNTRY_CODES.find((c) => c.code === code) ?? defaultEntry
    setSelected(entry)
    onChange?.(`${entry.dial} ${localPart}`.trim())
  }

  const handleLocalChange = (local: string) => {
    onChange?.(`${selected.dial} ${local}`.trim())
  }

  const inputId = label?.toLowerCase().replace(/\s+/g, '-') || 'phone'

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex h-10 w-full items-center rounded-lg border bg-surface-container text-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-primary',
          error ? 'border-error' : 'border-outline-variant',
        )}
      >
        <select
          value={selected.code}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="h-full rounded-l-lg bg-transparent pl-2 pr-1 text-on-surface outline-none cursor-pointer"
          aria-label="Country code"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code} className="bg-surface-container text-on-surface">
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <div className="w-px h-5 bg-outline-variant/40 mx-1 shrink-0" />
        <input
          id={inputId}
          type="tel"
          value={localPart}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-2 text-on-surface placeholder:text-on-surface-variant/40 outline-none font-mono"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
