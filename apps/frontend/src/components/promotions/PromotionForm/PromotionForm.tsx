'use client'

import { useState, useEffect } from 'react'
import { Tag, Percent, DollarSign, ShoppingCart, Package, LayoutGrid } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from '@/components/ui/Modal'
import type { Promotion, PromotionFormData, Product, ProductCategory } from '@ultimate-pos/shared'

interface PromotionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  editPromotion?: Promotion | null
}

const defaultValues: PromotionFormData = {
  name: '',
  description: null,
  is_active: true,
  target_type: 'cart',
  target_ids: null,
  discount_type: 'percentage',
  discount_value: 0,
  min_quantity: null,
  min_subtotal: null,
  max_uses: null,
  current_uses: 0,
  priority: 0,
  starts_at: null,
  ends_at: null,
  badge_text: null,
}

export function PromotionForm({ open, onOpenChange, onSaved, editPromotion }: PromotionFormProps) {
  const [form, setForm] = useState<PromotionFormData>(defaultValues)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selectedProductSearch, setSelectedProductSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editPromotion

  useEffect(() => {
    if (!open) return
    if (editPromotion) {
      setForm({
        name: editPromotion.name,
        description: editPromotion.description,
        is_active: editPromotion.is_active,
        target_type: editPromotion.target_type,
        target_ids: editPromotion.target_ids,
        discount_type: editPromotion.discount_type,
        discount_value: editPromotion.discount_value,
        min_quantity: editPromotion.min_quantity,
        min_subtotal: editPromotion.min_subtotal,
        max_uses: editPromotion.max_uses,
        current_uses: editPromotion.current_uses,
        priority: editPromotion.priority,
        starts_at: editPromotion.starts_at,
        ends_at: editPromotion.ends_at,
        badge_text: editPromotion.badge_text,
      })
    } else {
      setForm(defaultValues)
    }
    setError(null)
    setSelectedProductSearch('')

    api.get<{ data: Product[] }>('/products').then((res) => setProducts(res.data || [])).catch(() => {})
    api.get<{ data: ProductCategory[] }>('/categories').then((res) => setCategories(res.data || [])).catch(() => {})
  }, [open, editPromotion])

  const updateField = <K extends keyof PromotionFormData>(key: K, value: PromotionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTargetId = (id: string) => {
    setForm((prev) => {
      const current = prev.target_ids || []
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
      return { ...prev, target_ids: next.length > 0 ? next : null }
    })
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(selectedProductSearch.toLowerCase()),
  )

  const autoBadge = form.discount_type === 'percentage' && form.discount_value > 0
    ? `-${form.discount_value}%`
    : form.discount_type === 'fixed' && form.discount_value > 0
      ? `-$${form.discount_value}`
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || form.discount_value <= 0) return

    setSaving(true)
    setError(null)

    try {
      const body = {
        ...form,
        name: form.name.trim(),
        description: form.description || null,
        badge_text: form.badge_text || autoBadge,
        target_ids: form.target_type === 'cart' ? null : form.target_ids,
        min_quantity: form.min_quantity || null,
        min_subtotal: form.min_subtotal || null,
        max_uses: form.max_uses || null,
        current_uses: form.current_uses || 0,
        priority: form.priority || 0,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }

      if (isEditing) {
        await api.put(`/promotions/${editPromotion.id}`, body)
      } else {
        await api.post('/promotions', body)
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save promotion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Tag className="h-4 w-4 text-primary" />
            </div>
            <ModalTitle>{isEditing ? 'Edit Promotion' : 'New Promotion'}</ModalTitle>
          </div>
          <ModalDescription>
            {isEditing ? 'Update the promotion details.' : 'Create an automatic discount for your store.'}
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Promotion name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. Summer Sale, Happy Hour, 3+ Items"
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
              Description <span className="font-normal normal-case text-on-surface-variant/50">(optional)</span>
            </label>
            <textarea
              value={form.description || ''}
              onChange={(e) => updateField('description', e.target.value || null)}
              placeholder="Internal note about this promotion"
              rows={2}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Target Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
              Apply to
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { type: 'cart' as const, icon: ShoppingCart, label: 'Entire Cart' },
                { type: 'category' as const, icon: LayoutGrid, label: 'Category' },
                { type: 'product' as const, icon: Package, label: 'Products' },
              ]).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { updateField('target_type', type); updateField('target_ids', null) }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-label font-bold transition-all',
                    form.target_type === type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary/30',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Target IDs (products or categories) */}
          {form.target_type === 'product' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                Select Products
              </label>
              <input
                type="text"
                value={selectedProductSearch}
                onChange={(e) => setSelectedProductSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-outline-variant divide-y divide-outline-variant/50">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleTargetId(p.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      form.target_ids?.includes(p.id)
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-surface-container-high text-on-surface',
                    )}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center',
                      form.target_ids?.includes(p.id)
                        ? 'border-primary bg-primary text-primary-on'
                        : 'border-outline-variant',
                    )}>
                      {form.target_ids?.includes(p.id) && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="px-3 py-4 text-xs text-on-surface-variant text-center">No products found</p>
                )}
              </div>
              {form.target_ids && form.target_ids.length > 0 && (
                <p className="text-xs text-on-surface-variant">{form.target_ids.length} product(s) selected</p>
              )}
            </div>
          )}

          {form.target_type === 'category' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                Select Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleTargetId(cat.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-label font-bold transition-all',
                      form.target_ids?.includes(cat.id)
                        ? 'border-primary bg-primary text-primary-on'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary/30',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
                {categories.length === 0 && (
                  <p className="text-xs text-on-surface-variant">No categories found</p>
                )}
              </div>
            </div>
          )}

          {/* Discount Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                Discount Type
              </label>
              <div className="flex rounded-lg bg-surface-container-high p-1">
                <button
                  type="button"
                  onClick={() => updateField('discount_type', 'percentage')}
                  className={cn(
                    'flex-1 rounded-md px-3 py-2 text-xs font-label font-bold transition-all',
                    form.discount_type === 'percentage'
                      ? 'bg-primary text-primary-on shadow-sm'
                      : 'text-on-surface-variant',
                  )}
                >
                  <Percent className="h-3 w-3 inline mr-1" />
                  %
                </button>
                <button
                  type="button"
                  onClick={() => updateField('discount_type', 'fixed')}
                  className={cn(
                    'flex-1 rounded-md px-3 py-2 text-xs font-label font-bold transition-all',
                    form.discount_type === 'fixed'
                      ? 'bg-primary text-primary-on shadow-sm'
                      : 'text-on-surface-variant',
                  )}
                >
                  <DollarSign className="h-3 w-3 inline mr-1" />
                  $
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
                Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant font-bold">
                  {form.discount_type === 'percentage' ? '%' : '$'}
                </span>
                <input
                  type="number"
                  min={0}
                  step={form.discount_type === 'percentage' ? 1 : 0.01}
                  value={form.discount_value || ''}
                  onChange={(e) => updateField('discount_value', parseFloat(e.target.value) || 0)}
                  placeholder="10"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container pl-8 pr-3 py-2.5 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Badge Preview */}
          {autoBadge && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span>Auto badge:</span>
              <span className="rounded-md bg-secondary/10 px-2 py-0.5 font-label font-bold text-secondary">
                {autoBadge}
              </span>
            </div>
          )}

          {/* Conditions */}
          <div className="space-y-3">
            <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
              Conditions <span className="font-normal normal-case text-on-surface-variant/50">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-label text-on-surface-variant">Min. quantity</label>
                <input
                  type="number"
                  min={1}
                  value={form.min_quantity || ''}
                  onChange={(e) => updateField('min_quantity', parseInt(e.target.value) || null)}
                  placeholder="e.g. 3"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-label text-on-surface-variant">Min. subtotal ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.min_subtotal || ''}
                  onChange={(e) => updateField('min_subtotal', parseFloat(e.target.value) || null)}
                  placeholder="e.g. 50"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-label text-on-surface-variant">Max uses (total)</label>
                <input
                  type="number"
                  min={1}
                  value={form.max_uses || ''}
                  onChange={(e) => updateField('max_uses', parseInt(e.target.value) || null)}
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-label text-on-surface-variant">Priority (higher = first)</label>
                <input
                  type="number"
                  min={0}
                  value={form.priority || ''}
                  onChange={(e) => updateField('priority', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <label className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider">
              Schedule <span className="font-normal normal-case text-on-surface-variant/50">(optional, leave empty for always active)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-label text-on-surface-variant">Starts at</label>
                <input
                  type="datetime-local"
                  value={form.starts_at ? form.starts_at.slice(0, 16) : ''}
                  onChange={(e) => updateField('starts_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-label text-on-surface-variant">Ends at</label>
                <input
                  type="datetime-local"
                  value={form.ends_at ? form.ends_at.slice(0, 16) : ''}
                  onChange={(e) => updateField('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-error rounded-lg bg-error-container/20 border border-error/30 px-3 py-2">
              {error}
            </p>
          )}

          <ModalFooter>
            <ModalClose asChild>
              <Button type="button" variant="ghost" disabled={saving}>
                Cancel
              </Button>
            </ModalClose>
            <Button
              type="submit"
              disabled={!form.name.trim() || form.discount_value <= 0 || saving}
              isLoading={saving}
            >
              <Tag className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Promotion
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
