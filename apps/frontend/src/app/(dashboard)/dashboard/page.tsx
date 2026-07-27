'use client'

import { Skeleton } from '@/components/ui/Skeleton'
import { api, useGetProductsQuery, useGetOrdersQuery, useGetCustomerStatsQuery } from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, ListPlus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

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
  const timezone = useAppSelector((s) => s.storeConfig.currentStore?.settings?.timezone) || 'UTC'
  const { isLoading: productsLoading } = useGetProductsQuery()
  const { data: dashboardStats, isLoading: statsLoading } = api.useGetDashboardStatsQuery({ tz: timezone })
  const { data: ordersResult, isLoading: ordersLoading } = useGetOrdersQuery({ limit: 10 })
  const { data: customerStats, isLoading: customerStatsLoading } = useGetCustomerStatsQuery()
  const loading = productsLoading || statsLoading || ordersLoading || customerStatsLoading

  const todayRevenue = dashboardStats?.todayRevenue ?? 0
  const todayOrderCount = dashboardStats?.todayOrderCount ?? 0
  const activeOrders = dashboardStats?.activeOrders ?? 0
  const avgOrderValue = dashboardStats?.avgOrderValue ?? 0
  const salesByHour = dashboardStats?.salesByHour ?? []

  const recentOrders = ordersResult?.items ?? []

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today Revenue"
          value={formatCurrency(todayRevenue)}
          icon={DollarSign}
          trend={`${todayOrderCount} order${todayOrderCount !== 1 ? 's' : ''} today`}
        />
        <StatCard
          label="Active Orders"
          value={String(activeOrders)}
          icon={ShoppingCart}
          trend={activeOrders > 0 ? 'In progress' : 'No active orders'}
        />
        <StatCard
          label="Avg Ticket"
          value={formatCurrency(avgOrderValue)}
          icon={TrendingUp}
          trend="Per order"
        />
        <StatCard
          label="Total Customers"
          value={String(customerStats?.totalCustomers ?? 0)}
          icon={Users}
          trend={customerStats?.newThisMonth ? `${customerStats.newThisMonth} new this month` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5 transition-all duration-200 hover:bg-surface-container/70 hover:border-outline-variant/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider">Today&apos;s Sales</h2>
            <Link href="/analytics" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              Full analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {salesByHour.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByHour}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ccff00" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ccff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1c1c',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                    labelStyle={{ color: '#9e9e9e' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ccff00"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-on-surface-variant/40 text-sm">
              No sales yet today
            </div>
          )}
        </div>

        <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5 transition-all duration-200 hover:bg-surface-container/70 hover:border-outline-variant/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider">Last Orders</h2>
              <Link href="/orders" className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="h-6 w-6 text-on-surface-variant/40 mb-2" />
              <p className="text-xs text-on-surface-variant/60">No recent orders</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-outline-variant/10 last:border-0">
                  <div className="min-w-0">
                    <span className="text-xs text-on-surface truncate block">#{order.id.slice(0, 8)}</span>
                    <span className="text-[10px] text-on-surface-variant/60 capitalize">{order.payment_status || order.status}</span>
                  </div>
                  <span className="text-xs font-bold text-on-surface">{formatCurrency(order.total || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/pos"
          className="flex flex-col items-center gap-2 rounded-xl bg-surface-container/50 border border-outline-variant/30 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 group"
        >
          <ShoppingCart className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
          <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">New Sale</span>
        </Link>
        <Link
          href="/products/new"
          className="flex flex-col items-center gap-2 rounded-xl bg-surface-container/50 border border-outline-variant/30 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 group"
        >
          <ListPlus className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
          <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">Add Product</span>
        </Link>
        <Link
          href="/orders"
          className="flex flex-col items-center gap-2 rounded-xl bg-surface-container/50 border border-outline-variant/30 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 group"
        >
          <TrendingUp className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
          <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">View Orders</span>
        </Link>
        <Link
          href="/settings"
          className="flex flex-col items-center gap-2 rounded-xl bg-surface-container/50 border border-outline-variant/30 p-4 transition-all duration-200 hover:bg-primary/10 hover:border-primary/30 group"
        >
          <Package className="h-5 w-5 text-on-surface-variant group-hover:text-primary transition-colors" />
          <span className="text-xs font-label font-bold text-on-surface-variant group-hover:text-primary transition-colors">Settings</span>
        </Link>
      </div>
    </div>
  )
}
