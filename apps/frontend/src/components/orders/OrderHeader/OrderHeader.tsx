'use client'

import { RotateCw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
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
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <Tabs value={activeTab} onValueChange={(val) => onTabChange(val as OrderTab)}>
        <TabsList className="bg-surface-container/50 border border-outline-variant/40">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-4 py-1.5 text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
