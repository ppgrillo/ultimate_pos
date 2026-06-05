'use client'

import { Contact, QrCode, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentMethodSelectorProps {
  selected: string | null
  onSelect: (method: string) => void
}

const methods = [
  { id: 'nfc', label: 'NFC TAP', icon: Contact },
  { id: 'qr', label: 'QR PAY', icon: QrCode },
  { id: 'chip', label: 'CHIP', icon: CreditCard },
]

export function PaymentMethodSelector({ selected, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="flex gap-2">
      {methods.map((method) => {
        const Icon = method.icon
        const isSelected = selected === method.id
        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-label font-bold transition-all',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon className="h-5 w-5" />
            {method.label}
          </button>
        )
      })}
    </div>
  )
}
