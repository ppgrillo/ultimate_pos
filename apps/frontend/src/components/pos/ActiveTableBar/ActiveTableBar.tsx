'use client'

import { ReceiptText, UtensilsCrossed, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTable } from '@/store/slices/cartSlice'
import { setActiveView } from '@/store/slices/posSlice'

/**
 * Persistent context bar for the kitchen dine-in flow. It answers "which table
 * am I adding to?" from anywhere in the POS (menu / tables / order), so a
 * cashier never sends a round to the wrong table.
 */
export function ActiveTableBar() {
  const dispatch = useAppDispatch()
  const hasKitchen = useAppSelector((s) => s.storeConfig.currentStore?.settings?.hasKitchen) ?? false
  const orderType = useAppSelector((s) => s.cart.order_type)
  const tableNumber = useAppSelector((s) => s.cart.table_number)
  const roundCount = useAppSelector((s) => s.cart.items.reduce((sum, i) => sum + i.quantity, 0))
  const activeView = useAppSelector((s) => s.pos.activeView)

  if (!hasKitchen || orderType !== 'dine-in' || !tableNumber) return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-label font-bold text-on-surface">Mesa {tableNumber}</p>
          <p className="text-[10px] text-on-surface-variant">
            {roundCount > 0 ? `${roundCount} sin enviar` : 'Agregando a esta cuenta'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {activeView !== 'tables' && (
          <button
            onClick={() => dispatch(setActiveView('tables'))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-label font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            Ver cuenta
          </button>
        )}
        <button
          onClick={() => dispatch(setTable(null))}
          title="Quitar mesa"
          aria-label="Quitar mesa"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
