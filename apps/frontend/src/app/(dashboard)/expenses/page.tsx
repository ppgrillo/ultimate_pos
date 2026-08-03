'use client'

import { useState } from 'react'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import {
  useGetExpensesQuery,
  useGetExpenseSummaryQuery,
  useDeleteExpenseMutation,
} from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { cn, formatCurrency } from '@/lib/utils'
import { proxyImageUrl } from '@/lib/image-proxy'
import { Button } from '@/components/ui/Button'
import { DateField } from '@/components/ui/DateField'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from '@ultimate-pos/shared'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthStartKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatDate(key: string): string {
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const TYPE_CHIP: Record<ExpenseType, { label: string; className: string }> = {
  operating: { label: 'Operating', className: 'bg-primary/15 text-primary' },
  inventory: { label: 'Compras / Inventario', className: 'bg-accent/15 text-accent' },
}

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'

export default function ExpensesPage() {
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = userRole === 'admin'

  const [from, setFrom] = useState(monthStartKey())
  const [to, setTo] = useState(todayKey())
  const [type, setType] = useState<ExpenseType | ''>('')
  const [category, setCategory] = useState('')

  const { data: expenses = [], isLoading } = useGetExpensesQuery({ from, to, type, category })
  const { data: summary } = useGetExpenseSummaryQuery({ from, to })
  const [deleteExpense] = useDeleteExpenseMutation()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null)

  const filterCategories = type
    ? EXPENSE_CATEGORIES[type]
    : Array.from(new Set([...EXPENSE_CATEGORIES.operating, ...EXPENSE_CATEGORIES.inventory]))

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteExpense(confirmDelete.id).unwrap()
      setConfirmDelete(null)
    } catch {
      // ignore
    }
  }

  const operatingTotal = summary?.operatingTotal ?? 0
  const inventoryTotal = summary?.inventoryTotal ?? 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Expenses</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Track operating costs and inventory purchases for your store.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Expense
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Operating" value={formatCurrency(operatingTotal)} hint="Reduces Net Profit" tone="primary" />
        <SummaryCard label="Inventory" value={formatCurrency(inventoryTotal)} hint="Tracked only — see COGS" tone="accent" />
        <SummaryCard label="Total" value={formatCurrency(operatingTotal + inventoryTotal)} hint="Cash spent" />
        <SummaryCard label="Entries" value={String(summary?.count ?? 0)} hint="In the selected range" />
      </div>

      {/* Accounting note */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 px-4 py-3 text-xs leading-relaxed text-on-surface-variant">
        <span className="font-bold text-on-surface">Why inventory purchases don&apos;t reduce Net Profit:</span>{' '}
        buying merchandise converts cash into inventory you still own. That cost is recognized gradually through{' '}
        <span className="font-mono text-primary">COGS</span> (from each product&apos;s cost) when items are sold. Operating
        expenses — rent, salaries, utilities — reduce Net Profit immediately.
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DateField label="From" value={from} onChange={setFrom} />
          <DateField label="To" value={to} onChange={setTo} />
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1.5">Type</label>
            <select className={inputClass} value={type} onChange={(e) => { setType(e.target.value as ExpenseType | ''); setCategory('') }}>
              <option value="">All types</option>
              {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((t) => (
                <option key={t} value={t}>{EXPENSE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-on-surface mb-1.5">Category</label>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {filterCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high mb-4">
            <Receipt className="h-8 w-8 text-on-surface-variant/30" />
          </div>
          <p className="text-sm font-headline font-bold text-on-surface">No expenses in this range</p>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
            Adjust the filters or record your first expense.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/40 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-surface-container/50">
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{formatDate(expense.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', TYPE_CHIP[expense.type].className)}>
                        {TYPE_CHIP[expense.type].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-on-surface">{expense.category}</td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-[220px] truncate">{expense.description}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-on-surface">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3 text-right">{renderReceipt(expense)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ActionIconButton title="Edit" onClick={() => { setEditing(expense); setShowForm(true) }}>
                            <Pencil className="h-4 w-4" />
                          </ActionIconButton>
                          <ActionIconButton title="Delete" onClick={() => setConfirmDelete(expense)} danger>
                            <Trash2 className="h-4 w-4" />
                          </ActionIconButton>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {expenses.map((expense) => (
              <div key={expense.id} className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', TYPE_CHIP[expense.type].className)}>
                        {TYPE_CHIP[expense.type].label}
                      </span>
                      <span className="text-xs text-on-surface-variant">{formatDate(expense.expense_date)}</span>
                    </div>
                    <p className="mt-2 font-bold text-on-surface">{expense.category}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{expense.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono tabular-nums text-on-surface">{formatCurrency(expense.amount)}</p>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      {renderReceipt(expense)}
                      {isAdmin && (
                        <>
                          <ActionIconButton title="Edit" onClick={() => { setEditing(expense); setShowForm(true) }}>
                            <Pencil className="h-4 w-4" />
                          </ActionIconButton>
                          <ActionIconButton title="Delete" onClick={() => setConfirmDelete(expense)} danger>
                            <Trash2 className="h-4 w-4" />
                          </ActionIconButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ExpenseForm
        open={showForm}
        onOpenChange={setShowForm}
        expense={editing}
      />

      {/* Delete confirmation */}
      <Modal open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <ModalContent className="sm:max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete Expense</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
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

function renderReceipt(expense: Expense) {
  const url = proxyImageUrl(expense.receipt_url)
  if (!url) return <span className="text-[11px] text-on-surface-variant/40">—</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="View receipt"
      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
    >
      <Receipt className="h-3.5 w-3.5" />
      Receipt
    </a>
  )
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'primary' | 'accent' }) {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
      <p className={cn('mt-1 font-headline text-lg font-bold tabular-nums', tone === 'primary' ? 'text-primary' : tone === 'accent' ? 'text-accent' : 'text-on-surface')}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-on-surface-variant/60 mt-0.5">{hint}</p>}
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
