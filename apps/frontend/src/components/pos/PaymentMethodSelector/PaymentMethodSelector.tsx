'use client'

import { Banknote, CreditCard, Building } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { PaymentMethod, TerminalConfig } from '@ultimate-pos/shared'

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null
  onSelect: (method: PaymentMethod) => void
  acceptedMethods?: PaymentMethod[]
  amount?: number
  layout?: 'horizontal' | 'vertical'
  terminalProvider?: TerminalConfig | null
}

const methodConfig: Partial<Record<PaymentMethod, { label: string; icon: typeof Banknote }>> = {
  cash: { label: 'Cash', icon: Banknote },
  card: { label: 'Card', icon: CreditCard },
  transfer: { label: 'Transfer', icon: Building },
}

export function PaymentMethodSelector({
  selected,
  onSelect,
  acceptedMethods = ['cash', 'card', 'transfer'],
  amount,
  layout = 'horizontal',
  terminalProvider,
}: PaymentMethodSelectorProps) {
  const methods = acceptedMethods
    .filter((m): m is keyof typeof methodConfig => m in methodConfig)
    .map((m) => ({ id: m, ...methodConfig[m]! }))

  if (methods.length === 0) {
    return (
      <p className="text-xs text-on-surface-variant text-center py-2">
        No payment methods configured.
      </p>
    )
  }

  return (
    <div className={cn(
      'flex gap-2',
      layout === 'vertical' && 'flex-col',
    )}>
      {methods.map((method) => {
        const Icon = method.icon
        const isSelected = selected === method.id
        return (
          <button
            key={method.id}
            onClick={() => onSelect(method.id)}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-label font-bold transition-all',
              layout === 'horizontal' && 'flex-1 flex-col gap-1.5 py-3 text-xs',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon className={cn(layout === 'horizontal' ? 'h-5 w-5' : 'h-5 w-5 shrink-0')} />
            <span className="flex flex-col items-center">
              <span className="flex items-center gap-1.5">
                {method.label}
                {method.id === 'card' && terminalProvider && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    {terminalProvider.label ?? 'Terminal'}
                  </span>
                )}
              </span>
              {amount !== undefined && isSelected && (
                <span className="text-[10px] font-normal opacity-70">
                  {formatCurrency(amount)}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
