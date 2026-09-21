'use client'

import { useState } from 'react'
import { Pencil, Plus, Search, Trash2, Truck, PackageOpen, Phone, Globe, Mail, Timer } from 'lucide-react'
import { useGetSuppliersQuery, useDeleteSupplierMutation, useGetSupplierExpensesQuery } from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import type { Supplier, SupplierWithStats } from '@ultimate-pos/shared'

function formatDate(key: string | null): string {
  if (!key) return '—'
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

export default function SuppliersPage() {
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = userRole === 'admin'

  const [search, setSearch] = useState('')
  const { data: suppliers = [], isLoading } = useGetSuppliersQuery({ search })
  const [deleteSupplier] = useDeleteSupplierMutation()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SupplierWithStats | null>(null)
  const [viewing, setViewing] = useState<SupplierWithStats | null>(null)

  const { data: purchases = [] } = useGetSupplierExpensesQuery(
    { id: viewing?.id ?? '' },
    { skip: !viewing },
  )

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteSupplier(confirmDelete.id).unwrap()
      setConfirmDelete(null)
    } catch {
      // ignore
    }
  }

  const totalSpent = suppliers.reduce((sum, s) => sum + (s.stats?.totalSpent ?? 0), 0)
  const totalPurchases = suppliers.reduce((sum, s) => sum + (s.stats?.purchaseCount ?? 0), 0)
  const activeCount = suppliers.filter((s) => s.is_active).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Suppliers</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Permanent vendor registry. Link purchases (expenses) to find your best supplier.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Supplier
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Suppliers" value={String(suppliers.length)} hint="Registered" />
        <SummaryCard label="Active" value={String(activeCount)} hint="Available for purchases" tone="primary" />
        <SummaryCard label="Linked spend" value={formatCurrency(totalSpent)} hint="Across all suppliers" />
        <SummaryCard label="Purchases" value={String(totalPurchases)} hint="Linked expenses" />
      </div>

      {/* Search */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            className={cn(inputClass, 'pl-9')}
            placeholder="Search by name or contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high mb-4">
            <Truck className="h-8 w-8 text-on-surface-variant/30" />
          </div>
          <p className="text-sm font-headline font-bold text-on-surface">
            {search ? 'No suppliers match your search' : 'No suppliers yet'}
          </p>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
            {search ? 'Try a different name or contact.' : 'Add your first supplier to start tracking purchases.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={cn(
                'rounded-xl border bg-surface-container/30 p-4 transition-colors',
                supplier.is_active ? 'border-outline-variant/50' : 'border-outline-variant/30 opacity-70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-headline font-bold text-on-surface">{supplier.name}</p>
                    {!supplier.is_active && (
                      <span className="rounded-full bg-outline-variant/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Inactive
                      </span>
                    )}
                  </div>
                  {supplier.contact_name && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{supplier.contact_name}</p>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-1">
                    <ActionIconButton title="View purchases" onClick={() => setViewing(supplier)}>
                      <PackageOpen className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton title="Edit" onClick={() => { setEditing(supplier); setShowForm(true) }}>
                      <Pencil className="h-4 w-4" />
                    </ActionIconButton>
                    <ActionIconButton title="Delete" onClick={() => setConfirmDelete(supplier)} danger>
                      <Trash2 className="h-4 w-4" />
                    </ActionIconButton>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="mt-3 space-y-1.5 text-xs text-on-surface-variant">
                {supplier.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <a href={`tel:${supplier.phone}`} className="hover:text-primary">{supplier.phone}</a>
                  </p>
                )}
                {supplier.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${supplier.email}`} className="hover:text-primary truncate">{supplier.email}</a>
                  </p>
                )}
                {supplier.website && (
                  <p className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">
                      {supplier.website.replace(/^https?:\/\//, '')}
                    </a>
                  </p>
                )}
                {supplier.notes && <p className="text-on-surface-variant/80 mt-1">{supplier.notes}</p>}
              </div>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant/30 pt-3">
                <StatChip label="Total spent" value={formatCurrency(supplier.stats?.totalSpent ?? 0)} primary />
                <StatChip label="Purchases" value={String(supplier.stats?.purchaseCount ?? 0)} />
                <StatChip label="Avg expense" value={formatCurrency(supplier.stats?.avgExpense ?? 0)} />
                <StatChip label="Last purchase" value={formatDate(supplier.stats?.lastPurchaseDate ?? null)} />
                {supplier.stats?.avgDeliveryDays != null && (
                  <StatChip label="Avg delivery" value={`${supplier.stats.avgDeliveryDays} days`} icon={<Timer className="h-3 w-3" />} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SupplierForm
        open={showForm}
        onOpenChange={setShowForm}
        supplier={editing}
      />

      {/* Purchases modal */}
      <Modal open={!!viewing} onOpenChange={() => setViewing(null)}>
        <ModalContent className="sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>Purchases from {viewing?.name}</ModalTitle>
            <ModalDescription>Expenses linked to this supplier.</ModalDescription>
          </ModalHeader>
          <div className="px-6 pb-6">
            {purchases.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-6 text-center">No linked expenses yet.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/30">
                {purchases.map((expense) => (
                  <li key={expense.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{expense.description}</p>
                      <p className="text-xs text-on-surface-variant">
                        {formatDate(expense.expense_date)} · {expense.category}
                        {expense.delivery_days != null && ` · ${expense.delivery_days} days delivery`}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono tabular-nums text-on-surface">{formatCurrency(expense.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <ModalContent className="sm:max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete Supplier</ModalTitle>
            <ModalDescription>
              Delete <span className="font-bold text-on-surface">{confirmDelete?.name}</span>? Linked expenses will be kept but
              unlinked from this supplier.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'primary' }) {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={cn('mt-1 font-headline text-lg font-bold tabular-nums', tone === 'primary' ? 'text-primary' : 'text-on-surface')}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{hint}</p>}
    </div>
  )
}

function StatChip({ label, value, primary, icon }: { label: string; value: string; primary?: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">{label}</p>
      <p className={cn('text-sm font-bold tabular-nums flex items-center gap-1', primary ? 'text-primary' : 'text-on-surface')}>
        {icon}
        {value}
      </p>
    </div>
  )
}

function ActionIconButton({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors',
        danger ? 'hover:text-error hover:bg-error/10' : 'hover:text-on-surface hover:bg-surface-container-high',
      )}
    >
      {children}
    </button>
  )
}