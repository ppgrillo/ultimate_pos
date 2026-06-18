'use client'

import { RotateCw } from 'lucide-react'
import type { OrderTab } from '@/store/slices/orderSlice'

interface OrderHeaderProps {
  activeTab: OrderTab
  onTabChange: (tab: OrderTab) => void
  onRefresh: () => void
  orderCount: number
  loading?: boolean
  hasKitchen?: boolean
}

function getTabs(hasKitchen?: boolean) {
  const tabs: { value: OrderTab; label: string }[] = []
  if (hasKitchen) tabs.push({ value: 'active', label: 'Active' })
  tabs.push({ value: 'completed', label: 'Completed' })
  tabs.push({ value: 'all', label: 'All' })
  return tabs
}

export function OrderHeader({ activeTab, onTabChange, onRefresh, orderCount, loading, hasKitchen }: OrderHeaderProps) {
  const tabs = getTabs(hasKitchen)
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-1 rounded-xl bg-surface-container/50 border border-outline-variant/40 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-4 py-2 rounded-lg text-xs font-label font-bold transition-all duration-150 ${
              activeTab === tab.value
                ? 'bg-primary text-primary-on shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-on-surface-variant">
          {orderCount} order{orderCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-40"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
