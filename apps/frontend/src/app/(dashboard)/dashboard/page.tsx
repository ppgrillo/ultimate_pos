'use client'

import { Skeleton } from '@/components/ui/Skeleton'
import { useGetProductsQuery, useGetOrdersQuery, useGetCustomerStatsQuery } from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, ListPlus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string
  value: string
  icon: React.ElementType
  trend?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5 transition-all duration-200 hover:bg-surface-container/70 hover:border-outline-variant/60">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="font-headline text-2xl font-bold text-on-surface">{value}</p>
      {trend && <p className="text-xs text-on-surface-variant/60 mt-1">{trend}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const storeName = useAppSelector((s) => s.storeConfig.currentStore?.name)
  const { data: products = [], isLoading: productsLoading } = useGetProductsQuery()
  const { data: ordersResult, isLoading: ordersLoading } = useGetOrdersQuery(undefined)
  const orders = ordersResult?.items ?? []
  const { data: stats, isLoading: statsLoading } = useGetCustomerStatsQuery()
  const loading = productsLoading || ordersLoading || statsLoading

  const todayOrders = orders.filter(
    (o) => new Date(o.created_at || Date.now()).toDateString() === new Date().toDateString(),
  )
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const activeOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-surface-container/30 border border-outline-variant/30 p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-xl bg-surface-container/30 border border-outline-variant/30 p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="rounded-xl bg-surface-container/30 border border-outline-variant/30 p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-headline-lg text-on-surface text-balance">
          {storeName || 'Dashboard'}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat tiles — 4-column bento row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today Revenue"
          value={formatCurrency(todayRevenue)}
          icon={DollarSign}
          trend={`${todayOrders.length} order${todayOrders.length !== 1 ? 's' : ''} today`}
        />
        <StatCard
          label="Active Orders"
          value={String(activeOrders)}
          icon={ShoppingCart}
          trend={activeOrders > 0 ? 'In progress' : 'No active orders'}
        />
        <StatCard
          label="Total Customers"
          value={String(stats?.totalCustomers ?? 0)}
          icon={Users}
          trend={stats?.newThisMonth ? `${stats.newThisMonth} new this month` : undefined}
        />
        <StatCard
          label="Products"
          value={String(products.length)}
          icon={Package}
          trend={`${products.filter((p) => p.is_active).length} active`}
        />
      </div>

      {/* Bento row 2: Quick actions (2 cols) + Recent activity (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick actions — spans 2 cols */}
        <div className="lg:col-span-2 rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5 transition-all duration-200 hover:bg-surface-container/70 hover:border-outline-variant/60">
          <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/pos"
              className="flex flex-col items-center gap-2 rounded-lg bg-surface-container/60 border border-outline-variant/20 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 hover:text-primary group"
            >
              <ShoppingCart className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">New Sale</span>
            </Link>
            <Link
              href="/products/new"
              className="flex flex-col items-center gap-2 rounded-lg bg-surface-container/60 border border-outline-variant/20 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 hover:text-primary group"
            >
              <ListPlus className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">Add Product</span>
            </Link>
            <Link
              href="/orders"
              className="flex flex-col items-center gap-2 rounded-lg bg-surface-container/60 border border-outline-variant/20 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 hover:text-primary group"
            >
              <TrendingUp className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">View Orders</span>
            </Link>
            <Link
              href="/settings"
              className="flex flex-col items-center gap-2 rounded-lg bg-surface-container/60 border border-outline-variant/20 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 hover:text-primary group"
            >
              <Package className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
              <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">Settings</span>
            </Link>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5 transition-all duration-200 hover:bg-surface-container/70 hover:border-outline-variant/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="h-6 w-6 text-on-surface-variant/40 mb-2" />
              <p className="text-xs text-on-surface-variant/60">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-outline-variant/10 last:border-0">
                  <span className="text-xs text-on-surface truncate max-w-[140px]">#{order.id.slice(0, 8)}</span>
                  <span className="text-xs font-bold text-on-surface">{formatCurrency(order.total || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
