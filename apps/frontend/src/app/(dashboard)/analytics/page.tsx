'use client'

import { useState, useMemo } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { MetricGlossary } from '@/components/analytics/MetricGlossary'
import { useGetAnalyticsSalesQuery, useGetAnalyticsProductsQuery, useGetAnalyticsOverviewQuery } from '@/store/api'
import type { AnalyticsPeriod } from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, ShoppingCart, TrendingUp, Users, ArrowUpRight, ArrowDownRight, Minus, RefreshCw } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
  { value: 'year', label: 'Year' },
]

const PIE_COLORS = ['#ccff00', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe']

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-on-surface-variant/60">—</span>
  if (value === 0) return <Minus className="h-3 w-3 text-on-surface-variant/60" />
  const isPositive = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function KPICard({
  label,
  value,
  icon: Icon,
  change,
}: {
  label: string
  value: string
  icon: React.ElementType
  change?: number | null
}) {
  return (
    <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5 transition-all duration-200 hover:bg-surface-container/70 hover:border-outline-variant/60">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <p className="font-headline text-2xl font-bold text-on-surface">{value}</p>
        {change !== undefined && <ChangeIndicator value={change} />}
      </div>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-72 text-on-surface-variant/40 text-sm">
      {text}
    </div>
  )
}

const tooltipStyle = {
  backgroundColor: '#1c1c1c',
  border: '1px solid #333',
  borderRadius: '8px',
  fontSize: '12px',
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const storeName = useAppSelector((s) => s.storeConfig.currentStore?.name)
  const timezone = useAppSelector((s) => s.storeConfig.currentStore?.settings?.timezone) || 'UTC'
  const settings = useAppSelector((s) => s.storeConfig.currentStore?.settings)
  const taxLabel = settings?.taxLabel || 'Tax'
  const taxInclusive = settings?.taxInclusive ?? false

  const params = useMemo(
    () => ({
      period,
      tz: timezone,
      ...(period === 'custom' && customFrom ? { from: customFrom } : {}),
      ...(period === 'custom' && customTo ? { to: customTo } : {}),
    }),
    [period, customFrom, customTo, timezone],
  )

  const { data: sales, isLoading: salesLoading, refetch: refetchSales } = useGetAnalyticsSalesQuery(params)
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useGetAnalyticsProductsQuery({ ...params, limit: 10 })
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useGetAnalyticsOverviewQuery(params)
  const loading = salesLoading || productsLoading || overviewLoading

  const ordersByPaymentData = useMemo(() => {
    if (!overview?.ordersByPayment) return []
    return Object.entries(overview.ordersByPayment)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [overview?.ordersByPayment])

  const revenueByPaymentData = useMemo(() => {
    if (!overview?.revenueByPayment) return []
    return Object.entries(overview.revenueByPayment)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [overview?.revenueByPayment])

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-surface-container/30 border border-outline-variant/30 p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="rounded-xl bg-surface-container/30 border border-outline-variant/30 p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-headline text-headline-lg text-on-surface text-balance">Analytics</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {storeName ? `Sales insights for ${storeName}` : 'Sales insights'}
            </p>
          </div>
          <button
            onClick={() => { refetchSales(); refetchProducts(); refetchOverview() }}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-label font-bold transition-colors ${
                period === p.value
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-label font-bold transition-colors ${
              period === 'custom'
                ? 'bg-primary text-primary-on'
                : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            Custom
          </button>
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs bg-surface-container border border-outline-variant/30 text-on-surface"
              />
              <span className="text-on-surface-variant text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs bg-surface-container border border-outline-variant/30 text-on-surface"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Revenue"
          value={formatCurrency(sales?.revenue ?? 0)}
          icon={DollarSign}
          change={sales?.revenueChange}
        />
        <KPICard
          label="Orders"
          value={String(overview?.orderCount ?? 0)}
          icon={ShoppingCart}
          change={overview?.orderChange}
        />
        <KPICard
          label="Avg Ticket"
          value={formatCurrency(overview?.avgOrderValue ?? 0)}
          icon={TrendingUp}
          change={overview?.avgChange}
        />
        <KPICard
          label="New Customers"
          value={String(overview?.newCustomers ?? 0)}
          icon={Users}
        />
      </div>

      <MetricGlossary overview={overview} taxLabel={taxLabel} taxInclusive={taxInclusive} />

      <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5">
          <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider mb-4">Revenue Trend</h2>
          {sales?.revenueByTime && sales.revenueByTime.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales.revenueByTime}>
                  <defs>
                    <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ccff00" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ccff00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === 'revenue' ? 'Revenue' : String(name),
                    ]}
                    labelStyle={{ color: '#9e9e9e' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ccff00"
                    strokeWidth={2}
                    fill="url(#analyticsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="No data for this period" />
          )}
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5">
          <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider mb-4">Payment Methods</h2>
          {ordersByPaymentData.length > 0 ? (
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByPaymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {ordersByPaymentData.map((entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [Number(value) + ' orders', String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="No payment data for this period" />
          )}
        </div>

        <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5">
          <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider mb-4">Revenue by Payment</h2>
          {revenueByPaymentData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByPaymentData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  />
                  <Bar dataKey="value" fill="#ccff00" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="No payment data for this period" />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5">
          <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider mb-4">Top Products</h2>
          {products && products.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={products} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#9e9e9e' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Qty Sold',
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#ccff00" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text="No product data for this period" />
          )}
        </div>

      {products && products.length > 0 && (
        <div className="rounded-xl bg-surface-container/50 border border-outline-variant/30 p-5">
          <h2 className="font-label font-bold text-xs text-on-surface-variant uppercase tracking-wider mb-4">Product Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/30">
                  <th className="text-left text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider pb-3 pr-4">Product</th>
                  <th className="text-right text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider pb-3 px-4">Qty Sold</th>
                  <th className="text-right text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider pb-3 pl-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.productId} className="border-b border-outline-variant/10 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-sm text-on-surface truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-sm text-on-surface-variant">{p.quantitySold}</td>
                    <td className="py-2.5 pl-4 text-right text-sm font-bold text-on-surface">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
