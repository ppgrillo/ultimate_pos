'use client'

import { useRef, useState } from 'react'
import { Receipt, Upload, X } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DateField } from '@/components/ui/DateField'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_TYPE_LABELS,
  type Expense,
  type ExpenseType,
} from '@ultimate-pos/shared'
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useUploadReceiptMutation,
  useDeleteReceiptMutation,
} from '@/store/api'
import { proxyImageUrl } from '@/lib/image-proxy'
import { cn } from '@/lib/utils'

interface ExpenseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
}

interface FormState {
  type: ExpenseType
  category: string
  description: string
  amount: string
  expense_date: string
  receipt_url: string
}

function emptyForm(type: ExpenseType = 'operating'): FormState {
  return {
    type,
    category: EXPENSE_CATEGORIES[type][0],
    description: '',
    amount: '',
    expense_date: '',
    receipt_url: '',
  }
}

export function ExpenseForm({ open, onOpenChange, expense }: ExpenseFormProps) {
  const [createExpense] = useCreateExpenseMutation()
  const [updateExpense] = useUpdateExpenseMutation()
  const [uploadReceipt] = useUploadReceiptMutation()
  const [deleteReceipt] = useDeleteReceiptMutation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = EXPENSE_CATEGORIES[form.type]
  const editing = Boolean(expense)

  const setType = (type: ExpenseType) => {
    setForm((prev) => ({ ...prev, type, category: EXPENSE_CATEGORIES[type][0] }))
  }

  const reset = () => {
    setForm(emptyForm())
    setSaving(false)
    setUploading(false)
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleReceipt = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadReceipt(file).unwrap()
      setForm((prev) => ({ ...prev, receipt_url: result.url }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload receipt')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveReceipt = async () => {
    if (form.receipt_url) {
      try {
        await deleteReceipt({ url: form.receipt_url }).unwrap()
      } catch {
        // orphaned file is acceptable — keep the form usable
      }
    }
    setForm((prev) => ({ ...prev, receipt_url: '' }))
  }

  const handleSave = async () => {
    const amount = parseFloat(form.amount)
    if (!form.category) {
      setError('Pick a category')
      return
    }
    if (!form.description.trim()) {
      setError('Add a short description')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const body = {
        type: form.type,
        category: form.category,
        description: form.description.trim(),
        amount,
        expense_date: form.expense_date || undefined,
        receipt_url: form.receipt_url || null,
      }
      if (editing && expense) {
        await updateExpense({ id: expense.id, body }).unwrap()
      } else {
        await createExpense(body).unwrap()
      }
      handleOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error && 'data' in (err as any)
        ? ((err as any).data?.error ?? err.message)
        : err instanceof Error
          ? err.message
          : 'Failed to save expense'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = proxyImageUrl(form.receipt_url)

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>{editing ? 'Edit Expense' : 'Record Expense'}</ModalTitle>
          <ModalDescription>
            {editing
              ? 'Update the expense details below.'
              : 'Log an operating expense or an inventory purchase.'}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 px-6 pb-6">
          {error && (
            <div className="rounded-lg bg-error/10 border border-error/30 px-4 py-3 text-xs text-error">{error}</div>
          )}

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setType(type)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-bold transition-colors',
                    form.type === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant/50 bg-surface-container/40 text-on-surface-variant hover:bg-surface-container-high',
                  )}
                >
                  {EXPENSE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
              {form.type === 'operating'
                ? 'Day-to-day running costs that reduce Net Profit.'
                : 'Merchandise or raw materials you bought. Not an operating expense — its cost is recognized as COGS when sold.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                    form.category === cat
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-outline-variant/50 bg-surface-container/40 text-on-surface-variant hover:bg-surface-container-high',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="expense-description" className="block text-sm font-bold text-on-surface mb-1.5">Description</label>
            <textarea
              id="expense-description"
              className="w-full rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[64px] resize-y"
              placeholder="e.g. July office rent, 100 t-shirts from supplier"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              min={0.01}
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
            <DateField
              label="Date"
              value={form.expense_date}
              onChange={(value) => setForm((prev) => ({ ...prev, expense_date: value }))}
            />
          </div>

          <div>
            <label htmlFor="expense-receipt-input" className="block text-sm font-bold text-on-surface mb-1.5">Receipt (optional)</label>
            {previewUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant/50 bg-surface-container/40 p-3">
                <img src={previewUrl} alt="Receipt" className="h-16 w-16 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-on-surface truncate">Receipt uploaded</p>
                  <p className="text-[11px] text-on-surface-variant/70">Stored compressed to keep your storage light.</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                  title="Remove receipt"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant/70 bg-surface-container/30 px-3 py-4 text-sm text-on-surface-variant hover:border-primary/60 hover:text-on-surface transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Compressing & uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload a photo of the receipt
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              id="expense-receipt-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleReceipt(e.target.files?.[0])}
            />
            {form.receipt_url && <p className="text-[11px] text-on-surface-variant/70 mt-1 flex items-center gap-1"><Receipt className="h-3 w-3" />Receipt saved with this expense.</p>}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            {editing ? 'Save Changes' : 'Save Expense'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
