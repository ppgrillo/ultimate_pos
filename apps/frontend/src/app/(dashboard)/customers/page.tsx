'use client'

import { useEffect, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Search, Plus, Tags, ArrowUpDown, User, ShoppingCart, Star, TrendingUp, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useCreateCustomerMutation, useGetCustomerStatsQuery, useGetCustomersQuery, useUpdateCustomerMutation } from '@/store/api'
import type { CustomerWithLoyalty } from '@/store/api'

export default function CustomersPage() {
  const router = useRouter()
  const preferenceFields = useAppSelector((s) => s.storeConfig.currentStore?.settings?.preferenceFields ?? [])

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState('created_at')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editCustomer, setEditCustomer] = useState<any>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    tags: '',
    source: '',
    preferred_contact: '',
    preferences: '{}' as string,
    social_handles: '{}' as string,
    birthday: '',
  })

  const { data: result, isLoading } = useGetCustomersQuery({ search, tag: tagFilter, sort, page, limit: pageSize })
  const typedCustomers = (result?.data || []) as CustomerWithLoyalty[]
  const hasServerPagination =
    typeof result?.total === 'number' &&
    typeof result?.totalPages === 'number' &&
    typeof result?.page === 'number' &&
    typeof result?.limit === 'number'

  const total = hasServerPagination ? result.total : typedCustomers.length
  const totalPages = hasServerPagination
    ? result.totalPages
    : Math.max(1, Math.ceil(total / pageSize))
  const pageCustomers = hasServerPagination
    ? typedCustomers
    : typedCustomers.slice((page - 1) * pageSize, page * pageSize)
  const { data: stats, isLoading: isLoadingStats } = useGetCustomerStatsQuery()
  const [createCustomer] = useCreateCustomerMutation()
  const [updateCustomer] = useUpdateCustomerMutation()

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleTagFilter = (tag: string) => {
    setTagFilter((current) => (current === tag ? '' : tag))
    setPage(1)
  }

  const handleSort = (col: string) => {
    setSort(col)
    setPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value))
    setPage(1)
  }

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', notes: '', tags: '', source: '', preferred_contact: '', preferences: '{}', social_handles: '{}', birthday: '' })
    setEditCustomer(null)
  }

  const handleSubmit = async () => {
    const payload: any = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      source: form.source || null,
      preferred_contact: form.preferred_contact || null,
      birthday: form.birthday || null,
    }

    try {
      const prefs = JSON.parse(form.preferences)
      payload.preferences = prefs
    } catch { /* keep default */ }

    try {
      const handles = JSON.parse(form.social_handles)
      payload.social_handles = handles
    } catch { /* keep default */ }

    if (editCustomer) {
      await updateCustomer({ id: editCustomer.id, body: payload }).unwrap()
    } else {
      await createCustomer(payload).unwrap()
    }

    setShowCreate(false)
    resetForm()
  }

  const allTags = [...new Set(typedCustomers.flatMap((c) => c.tags || []))].sort()

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-headline text-headline-lg text-on-surface">Customers</h1>
        <Button onClick={() => { resetForm(); setShowCreate(true) }} className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
        <Card className="!p-3 sm:!p-4 md:!p-6">
          <CardHeader className="mb-0 md:mb-4">
            <CardDescription className="text-xs md:text-sm">Total Customers</CardDescription>
            <CardTitle className="text-lg md:text-2xl flex items-center gap-2">
              <User className="h-4 w-4 text-primary md:h-5 md:w-5" />
              {isLoadingStats ? '...' : stats?.totalCustomers ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="!p-3 sm:!p-4 md:!p-6">
          <CardHeader className="mb-0 md:mb-4">
            <CardDescription className="text-xs md:text-sm">New This Month</CardDescription>
            <CardTitle className="text-lg md:text-2xl flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary md:h-5 md:w-5" />
              {isLoadingStats ? '...' : stats?.newThisMonth ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="!p-3 sm:!p-4 md:!p-6">
          <CardHeader className="mb-0 md:mb-4">
            <CardDescription className="text-xs md:text-sm">Avg Order Value</CardDescription>
            <CardTitle className="text-lg md:text-2xl flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-tertiary md:h-5 md:w-5" />
              {isLoadingStats ? '...' : formatCurrency(stats?.avgOrderValue ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="!p-3 sm:!p-4 md:!p-6">
          <CardHeader className="mb-0 md:mb-4">
            <CardDescription className="text-xs md:text-sm">Top Spender</CardDescription>
            <CardTitle className="text-base md:text-2xl truncate flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400 md:h-5 md:w-5 shrink-0" />
              <span className="truncate">{isLoadingStats ? '...' : stats?.topSpenders?.[0]?.name || 'N/A'}</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-1 md:gap-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="h-10 w-full rounded-xl border border-outline-variant bg-surface-container pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          {(allTags.length > 0 || true) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container px-2.5 py-1.5 text-xs font-label font-bold text-on-surface-variant hover:text-on-surface transition-colors md:hidden"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              Filters
            </button>
          )}
        </div>

        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:items-center gap-2 md:gap-3 pt-2 md:pt-0 md:mt-2`}>
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <Tags className="h-4 w-4 text-on-surface-variant shrink-0" />
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-label font-bold transition-colors ${
                    tagFilter === tag
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {['name', 'total_spent', 'total_visits', 'created_at'].map((col) => (
              <button
                key={col}
                onClick={() => handleSort(col)}
                className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-label font-bold transition-colors flex items-center gap-1 ${
                  sort === col
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {col === 'created_at' ? 'Newest' : col.replace('_', ' ')}
                <ArrowUpDown className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className="!p-0 md:!p-0">
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : pageCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container/50 border border-outline-variant/40 mb-4">
                <Users className="h-6 w-6 text-on-surface-variant/60" />
              </div>
              <p className="font-label font-bold text-sm text-on-surface-variant mb-1">
                {search ? 'No customers match your search' : 'No customers yet'}
              </p>
              <p className="text-xs text-on-surface-variant/60 mb-4">
                {search ? 'Try a different name, email, or phone number' : 'Click "Add Customer" to get started'}
              </p>
              {!search && (
                <Button onClick={() => { resetForm(); setShowCreate(true) }} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="lg:hidden divide-y divide-outline-variant/50">
                {pageCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-container-high/50 cursor-pointer transition-colors active:bg-surface-container-high"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-xs font-headline font-bold text-on-surface">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-label font-bold text-[13px] leading-tight text-on-surface">{c.name}</p>
                        {c.loyalty && (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-label font-bold uppercase tracking-wider ${
                            c.loyalty.tier === 'platinum' ? 'bg-primary/20 text-primary' :
                            c.loyalty.tier === 'gold' ? 'bg-amber-400/20 text-amber-400' :
                            c.loyalty.tier === 'silver' ? 'bg-slate-400/20 text-slate-300' :
                            'bg-orange-600/20 text-orange-400'
                          }`}>
                            {c.loyalty.tier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] leading-tight text-on-surface-variant mt-0.5">
                        {c.email && <span className="truncate">{c.email}</span>}
                        {!c.email && c.phone && <span>{c.phone}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] leading-tight text-on-surface-variant">
                        <span className="font-bold text-on-surface">{formatCurrency(c.total_spent)}</span>
                        <span>·</span>
                        <span>{c.total_visits} visits</span>
                        {c.loyalty && (
                          <>
                            <span>·</span>
                            <span className="text-primary font-bold">{c.loyalty.points}pts</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant text-left text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Tags</th>
                      <th className="px-4 py-3 text-right">Visits</th>
                      <th className="px-4 py-3 text-right">Total Spent</th>
                      <th className="px-4 py-3 text-right">Loyalty</th>
                      <th className="px-4 py-3 text-right">Customer Since</th>
                    </tr>
                  </thead>
                <tbody>
                  {pageCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/customers/${c.id}`)}
                      className="border-b border-outline-variant/50 hover:bg-surface-container-high/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-xs font-headline font-bold text-on-surface">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-label font-bold text-sm text-on-surface">{c.name}</p>
                            {c.source && <p className="text-[11px] text-on-surface-variant">via {c.source}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-on-surface-variant space-y-0.5">
                          {c.email && <p>{c.email}</p>}
                          {c.phone && <p>{c.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.tags || []).slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-label font-bold text-on-surface-variant">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-on-surface font-label font-bold">{c.total_visits}</td>
                      <td className="px-4 py-3 text-right text-sm text-on-surface font-label font-bold">{formatCurrency(c.total_spent)}</td>
                      <td className="px-4 py-3 text-right">
                        {c.loyalty ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-label font-bold uppercase tracking-wider ${
                            c.loyalty.tier === 'platinum' ? 'bg-primary/20 text-primary' :
                            c.loyalty.tier === 'gold' ? 'bg-amber-400/20 text-amber-400' :
                            c.loyalty.tier === 'silver' ? 'bg-slate-400/20 text-slate-300' :
                            'bg-orange-600/20 text-orange-400'
                          }`}>
                            {c.loyalty.tier} · {c.loyalty.points}pts
                          </span>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-on-surface-variant">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-outline-variant/50 bg-surface-container/40 px-3 py-2">
            <p className="text-[11px] sm:text-xs text-on-surface-variant">
              Showing {pageCustomers.length} of {total}
            </p>
            <label className="flex items-center gap-2 text-[11px] sm:text-xs text-on-surface-variant">
              Per page
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="h-8 rounded-lg border border-outline-variant bg-surface px-2 text-on-surface"
              >
                {[10, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-outline-variant/50 bg-surface-container/40 p-2 sm:hidden">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 text-xs font-label font-bold text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <div className="text-center">
              <p className="text-xs font-label font-bold text-on-surface">Page {page} of {totalPages}</p>
              <p className="text-[11px] text-on-surface-variant">{total} customers</p>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-2.5 text-xs font-label font-bold text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden items-center justify-between sm:flex">
            <p className="text-xs text-on-surface-variant">
              {total} customers · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-label font-bold transition-colors ${
                      page === pageNum
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm() } }}>
        <ModalContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle>{editCustomer ? 'Edit Customer' : 'New Customer'}</ModalTitle>
            <ModalDescription>{editCustomer ? 'Update customer information.' : 'Add a new customer to your database.'}</ModalDescription>
          </ModalHeader>
          <div className="space-y-4 px-6 py-4">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
              <PhoneInput
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="">Select source...</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="referral">Referral</option>
                  <option value="walk-in">Walk-in</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Preferred Contact</label>
                <select
                  value={form.preferred_contact}
                  onChange={(e) => setForm({ ...form, preferred_contact: e.target.value })}
                  className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="">Select...</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="dm">DM</option>
                  <option value="call">Call</option>
                </select>
              </div>
            </div>
            <Input
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            />
            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Tags <span className="text-on-surface-variant/50">(comma separated)</span></label>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="VIP, frequent, streetwear..."
                className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {preferenceFields.length > 0 && (
              <div>
                <label className="block text-xs font-label font-bold text-on-surface-variant mb-2">Preferences</label>
                <div className="space-y-3 rounded-xl bg-surface-container/50 border border-outline-variant/50 p-4">
                  {preferenceFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-label font-bold text-on-surface-variant mb-1">{field.label}</label>
                      {field.type === 'text' && (
                        <input
                          value={(() => {
                            try {
                              const prefs = JSON.parse(form.preferences)
                              return prefs[field.key] || ''
                            } catch { return '' }
                          })()}
                          onChange={(e) => {
                            try {
                              const prefs = JSON.parse(form.preferences)
                              prefs[field.key] = e.target.value
                              setForm({ ...form, preferences: JSON.stringify(prefs) })
                            } catch {}
                          }}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                          className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          value={(() => {
                            try {
                              const prefs = JSON.parse(form.preferences)
                              return prefs[field.key] || ''
                            } catch { return '' }
                          })()}
                          onChange={(e) => {
                            try {
                              const prefs = JSON.parse(form.preferences)
                              prefs[field.key] = e.target.value
                              setForm({ ...form, preferences: JSON.stringify(prefs) })
                            } catch {}
                          }}
                          className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container px-3 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                          <option value="">Select...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === 'multiselect' && (
                        <div className="flex flex-wrap gap-1.5">
                          {(field.options || []).map((opt) => {
                            const isSelected = (() => {
                              try {
                                const prefs = JSON.parse(form.preferences)
                                return (prefs[field.key] || []).includes(opt)
                              } catch { return false }
                            })()
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  try {
                                    const prefs = JSON.parse(form.preferences)
                                    const current: string[] = prefs[field.key] || []
                                    prefs[field.key] = isSelected
                                      ? current.filter((s: string) => s !== opt)
                                      : [...current, opt]
                                    setForm({ ...form, preferences: JSON.stringify(prefs) })
                                  } catch {}
                                }}
                                className={`rounded-full px-3 py-1 text-xs font-label font-bold transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                }`}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Social Handles <span className="text-on-surface-variant/50">(JSON)</span></label>
              <textarea
                value={form.social_handles}
                onChange={(e) => setForm({ ...form, social_handles: e.target.value })}
                placeholder='{"instagram": "@user", "tiktok": "@user"}'
                rows={2}
                className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-label font-bold text-on-surface-variant mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any notes about this customer..."
                rows={3}
                className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setShowCreate(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name.trim()}>
              {editCustomer ? 'Update Customer' : 'Create Customer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
