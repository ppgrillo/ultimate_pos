'use client'

import { Star, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedCustomer } from '@/store/slices/customersSlice'
import { setCustomer } from '@/store/slices/cartSlice'

export function CustomerMiniBadge() {
  const dispatch = useAppDispatch()
  const selectedCustomer = useAppSelector((s) => s.customers.selectedCustomer)

  if (!selectedCustomer) return null

  const handleClear = () => {
    dispatch(setSelectedCustomer(null))
    dispatch(setCustomer(null))
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container/80 border border-outline-variant/50 px-3 py-2 shadow-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-headline font-bold text-primary shrink-0">
        {selectedCustomer.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-label font-bold text-on-surface truncate">{selectedCustomer.name}</p>
        {selectedCustomer.loyalty?.points ? (
          <p className="text-[10px] text-primary flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5" />
            {selectedCustomer.loyalty.points} pts
          </p>
        ) : null}
      </div>
      <button
        onClick={handleClear}
        className="flex h-6 w-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-higher hover:text-on-surface transition-colors shrink-0"
        title="Remove customer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
