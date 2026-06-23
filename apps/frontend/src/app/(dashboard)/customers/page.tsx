'use client'

import { useState } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Search, Plus, Tags, ArrowUpDown, User, ShoppingCart, Star, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useCreateCustomerMutation, useGetCustomerStatsQuery, useGetCustomersQuery, useUpdateCustomerMutation } from '@/store/api'
import type { CustomerWithLoyalty } from '@/store/api'

export default function CustomersPage() {
  const router = useRouter()
  const preferenceFields = useAppSelector((s) => s.storeConfig.currentStore?.settings?.preferenceFields ?? [])

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState('name')
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

  const { data: customers = [], isLoading } = useGetCustomersQuery({ search, tag: tagFilter, sort })
  const { data: stats, isLoading: isLoadingStats } = useGetCustomerStatsQuery()
  const [createCustomer] = useCreateCustomerMutation()
  const [updateCustomer] = useUpdateCustomerMutation()
  const typedCustomers = customers as CustomerWithLoyalty[]

  const handleSearch = (val: string) => {
    setSearch(val)
  }

  const handleTagFilter = (tag: string) => {
    setTagFilter((current) => (current === tag ? '' : tag))
  }

  const handleSort = (col: string) => {
    setSort((current) => (current === col ? '' : col))
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-headline-lg text-on-surface">Customers</h1>
        <Button onClick={() => { resetForm(); setShowCreate(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {isLoadingStats ? '...' : stats?.totalCustomers ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>New This Month</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              {isLoadingStats ? '...' : stats?.newThisMonth ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Avg Order Value</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-tertiary" />
              {isLoadingStats ? '...' : formatCurrency(stats?.avgOrderValue ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Top Spender</CardDescription>
            <CardTitle className="text-2xl truncate flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              {isLoadingStats ? '...' : stats?.topSpenders?.[0]?.name || 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name, email, or phone..."
              className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Tags className="h-4 w-4 text-on-surface-variant" />
            {allTags.slice(0, 10).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagFilter(tag)}
                className={`rounded-full px-3 py-1 text-xs font-label font-bold transition-colors ${
                  tagFilter === tag
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {['name', 'total_spent', 'total_visits', 'created_at'].map((col) => (
              <button
                key={col}
                onClick={() => handleSort(col)}
                className={`rounded-lg px-2.5 py-1 text-xs font-label font-bold transition-colors flex items-center gap-1 ${
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
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-on-surface-variant">Loading customers...</div>
          ) : typedCustomers.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              {search ? 'No customers match your search.' : 'No customers yet. Click "Add Customer" to get started.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {typedCustomers.map((c) => (
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
          )}
        </CardContent>
      </Card>

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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
