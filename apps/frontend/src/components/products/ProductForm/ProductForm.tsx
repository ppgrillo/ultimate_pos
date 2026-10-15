'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Sparkles, Package, PackageOpen, Scale } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/products/ImageUpload'
import { CategoryChips } from '@/components/products/CategoryChips'
import { CreateCategoryModal } from '@/components/products/CreateCategoryModal'
import { OptionGroupEditor } from '@/components/products/OptionGroupEditor'
import { PointsInput } from '@/components/products/PointsInput'
import { useAppSelector } from '@/store/hooks'
import { useGetCategoriesQuery, useCreateProductMutation, useUpdateProductMutation } from '@/store/api'
import type { ModifierGroup } from '@ultimate-pos/shared'
import type { CreatedCategory } from '@/components/products/CreateCategoryModal'

interface ProductFormData {
  name: string
  price: number
  cost: number | null
  sku: string | null
  barcode: string | null
  description: string | null
  category_id: string | null
  image_url: string | null
  modifiers: ModifierGroup[]
  points: number | null
  stock_qty: number | null
  track_inventory: boolean
  low_stock_threshold: number | null
  tax_exempt: boolean
  is_bulk: boolean
  bulk_unit: string | null
  bulk_step: number | null
}

interface Category {
  id: string
  name: string
}

interface ProductFormProps {
  productId?: string
  initialData?: ProductFormData
}

const defaultForm: ProductFormData = {
  name: '',
  price: 0,
  cost: null,
  sku: null,
  barcode: null,
  description: null,
  category_id: null,
  image_url: null,
  modifiers: [],
  points: null,
  stock_qty: null,
  track_inventory: false,
  low_stock_threshold: null,
  tax_exempt: false,
  is_bulk: false,
  bulk_unit: 'kg',
  bulk_step: 0.1,
}

const BULK_UNIT_PRESETS = ['kg', 'g', 'lb', 'l', 'ml', 'm', 'unidad']

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!productId
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = userRole === 'admin'
  const storeSettings = useAppSelector((state) => state.storeConfig.currentStore?.settings)
  const hasVariants = storeSettings?.hasVariants ?? false
  const hasLoyalty = storeSettings?.hasLoyalty ?? false
  const trackInventory = storeSettings?.trackInventory ?? false
  const taxExemptEnabled = storeSettings?.taxExemptEnabled ?? false

  const [form, setForm] = useState<ProductFormData>(() => {
    if (initialData) return initialData
    return { ...defaultForm, track_inventory: trackInventory ?? false }
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [createProduct, { isLoading: createLoading }] = useCreateProductMutation()
  const [updateProduct, { isLoading: updateLoading }] = useUpdateProductMutation()
  const { data: queryCategories = [] } = useGetCategoriesQuery()

  const baselineRef = useRef(initialData ?? { ...defaultForm, track_inventory: trackInventory ?? false })
  const isDirty = useMemo(() => {
    const b = baselineRef.current
    return (
      form.name !== b.name ||
      form.price !== b.price ||
      form.cost !== b.cost ||
      form.sku !== b.sku ||
      form.barcode !== b.barcode ||
      form.description !== b.description ||
      form.category_id !== b.category_id ||
      form.image_url !== b.image_url ||
      form.points !== b.points ||
      form.stock_qty !== b.stock_qty ||
      form.track_inventory !== b.track_inventory ||
      form.low_stock_threshold !== b.low_stock_threshold ||
      form.tax_exempt !== b.tax_exempt ||
      form.is_bulk !== b.is_bulk ||
      form.bulk_unit !== b.bulk_unit ||
      form.bulk_step !== b.bulk_step ||
      JSON.stringify(form.modifiers) !== JSON.stringify(b.modifiers)
    )
  }, [form])

  useEffect(() => {
    setCategories(queryCategories)
  }, [queryCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const cleanModifiers = form.modifiers
        .map((g) => ({
          ...g,
          options: g.options.filter((o) => o.name.trim().length > 0),
        }))
        .filter((g) => g.options.length > 0)

      const payload = {
        name: form.name,
        price: form.price,
        cost: form.cost,
        sku: form.sku || null,
        barcode: form.barcode || null,
        description: form.description,
        category_id: form.category_id,
        image_url: form.image_url,
        // Bulk products cannot have modifiers; force an empty list.
        modifiers: form.is_bulk ? [] : cleanModifiers,
        points: form.points ?? 0,
        stock_qty: form.stock_qty,
        track_inventory: form.track_inventory,
        low_stock_threshold: form.low_stock_threshold,
        tax_exempt: form.tax_exempt,
        is_bulk: form.is_bulk,
        bulk_unit: form.is_bulk ? (form.bulk_unit || 'kg') : null,
        bulk_step: form.is_bulk ? (form.bulk_step && form.bulk_step > 0 ? form.bulk_step : 0.1) : null,
      }

      if (isEditing) {
        await updateProduct({ id: productId!, body: payload }).unwrap()
      } else {
        await createProduct(payload).unwrap()
      }

      router.push('/products')
      router.refresh()
    } catch (err) {
      if (err instanceof Error) {
        const body = (err as any).body
        if (body?.error?.issues?.length) {
          const messages = body.error.issues
            .map((i: any) => `${i.path.join(' › ')}: ${i.message}`)
            .join('\n')
          setError(messages)
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to save product')
      }
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCategoryCreated = (cat: CreatedCategory) => {
    setCategories((prev) => [...prev, { id: cat.id, name: cat.name }])
    updateField('category_id', cat.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return
              router.back()
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-6 w-6 text-on-surface" />
          </button>
          <div>
            <h1 className="font-headline text-headline-md text-on-surface">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isEditing ? 'Update product details' : 'Configure your new product'}
            </p>
          </div>
        </div>
        <Button type="submit" disabled={saving || !form.name || form.price <= 0 || !form.sku} isLoading={saving || createLoading || updateLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Update' : 'Save'}
        </Button>
      </div>

      {(() => {
        const missing: string[] = []
        if (!form.name) missing.push('Product Name')
        if (form.price <= 0) missing.push('Base Price')
        if (!form.sku) missing.push('SKU')
        if (missing.length === 0) return null
        return (
          <p className="text-xs text-error ml-16">
            Fill in the required fields: {missing.join(', ')}
          </p>
        )
      })()}

      {error && (
        <div className="rounded-lg bg-error-container/20 border border-error/30 p-4 text-sm text-error whitespace-pre-wrap">
          {error}
        </div>
      )}

      <ImageUpload
        value={form.image_url}
        onChange={(v) => updateField('image_url', v)}
      />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="font-headline font-bold text-xl text-on-surface">Selling Mode</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateField('is_bulk', false)}
            className={
              !form.is_bulk
                ? 'rounded-xl border-2 border-primary bg-primary/10 p-4 text-left transition-colors'
                : 'rounded-xl border border-outline-variant bg-surface-container/50 p-4 text-left transition-colors hover:bg-surface-container/80'
            }
          >
            <span className="block text-sm font-bold text-on-surface">Per piece</span>
            <span className="mt-0.5 block text-xs text-on-surface-variant">
              Sell fixed units — each, plate, box
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              updateField('is_bulk', true)
              if (!form.bulk_unit) updateField('bulk_unit', 'kg')
              if (!form.bulk_step) updateField('bulk_step', 0.1)
            }}
            className={
              form.is_bulk
                ? 'rounded-xl border-2 border-primary bg-primary/10 p-4 text-left transition-colors'
                : 'rounded-xl border border-outline-variant bg-surface-container/50 p-4 text-left transition-colors hover:bg-surface-container/80'
            }
          >
            <span className="block text-sm font-bold text-on-surface">By weight / bulk</span>
            <span className="mt-0.5 block text-xs text-on-surface-variant">
              Sell by kg, liters, meters… — customer enters the amount
            </span>
          </button>
        </div>

        {form.is_bulk && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Unit
              </label>
              <div className="flex flex-wrap gap-2">
                {BULK_UNIT_PRESETS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => updateField('bulk_unit', u)}
                    className={
                      form.bulk_unit === u
                        ? 'rounded-full border-2 border-primary bg-primary/15 px-4 py-1.5 text-xs font-bold font-headline text-primary uppercase'
                        : 'rounded-full border border-outline-variant bg-surface-container px-4 py-1.5 text-xs font-bold font-headline text-on-surface-variant uppercase hover:border-primary/50'
                    }
                  >
                    {u}
                  </button>
                ))}
                {!form.bulk_unit || !BULK_UNIT_PRESETS.includes(form.bulk_unit) ? null : (
                  <button
                    type="button"
                    onClick={() => updateField('bulk_unit', '')}
                    className="rounded-full border border-dashed border-outline-variant px-4 py-1.5 text-xs font-bold font-headline text-on-surface-variant uppercase hover:border-primary/50"
                  >
                    Other
                  </button>
                )}
              </div>
              {(!form.bulk_unit || !BULK_UNIT_PRESETS.includes(form.bulk_unit)) && (
                <input
                  type="text"
                  value={form.bulk_unit ?? ''}
                  onChange={(e) => updateField('bulk_unit', e.target.value.slice(0, 16))}
                  placeholder="Type a custom unit, e.g. bolsa"
                  maxLength={16}
                  autoFocus
                  className="mt-3 w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40"
                />
              )}
            </div>

            <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                Increment Step
              </label>
              <input
                type="number"
                min={0.001}
                max={1000}
                step="any"
                value={form.bulk_step ?? ''}
                onChange={(e) =>
                  updateField('bulk_step', e.target.value ? parseFloat(e.target.value) : 0.1)
                }
                placeholder="0.1"
                className="w-full bg-transparent border-none p-0 font-headline font-semibold text-on-surface text-lg focus:ring-0 placeholder:text-on-surface-variant/30"
              />
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Decimal keypad snaps to this, e.g. 0.1 → 1.5 kg
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-headline font-bold text-xl text-on-surface">Basic Info</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Product Name
              <span className="ml-1.5 inline-flex items-center rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold text-error">Required</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Caramel Macchiato Venti"
              required
              className="w-full bg-transparent border-none p-0 font-headline font-semibold text-on-surface text-lg focus:ring-0 placeholder:text-on-surface-variant/30"
            />
          </div>

          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Base Price ($)
              <span className="ml-1.5 inline-flex items-center rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold text-error">Required</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-primary font-headline text-lg font-bold">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price || ''}
                onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
                className="w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              SKU
              <span className="ml-1.5 inline-flex items-center rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold text-error">Required</span>
            </label>
            <input
              type="text"
              value={form.sku ?? ''}
              onChange={(e) => updateField('sku', e.target.value || null)}
              placeholder="e.g. BEV-001"
              className="w-full bg-transparent border-none p-0 font-headline font-semibold text-on-surface text-lg focus:ring-0 placeholder:text-on-surface-variant/30"
            />
          </div>

          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Cost ($)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant font-headline text-lg font-bold">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.cost ?? ''}
                onChange={(e) => updateField('cost', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="0.00"
                className="w-full bg-transparent border-none p-0 text-lg font-headline font-bold text-on-surface focus:ring-0 placeholder:text-on-surface-variant/30"
              />
            </div>
          </div>

          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Barcode
            </label>
            <input
              type="text"
              value={form.barcode ?? ''}
              onChange={(e) => updateField('barcode', e.target.value || null)}
              placeholder="e.g. 7501234567890"
              className="w-full bg-transparent border-none p-0 font-headline font-semibold text-on-surface text-lg focus:ring-0 placeholder:text-on-surface-variant/30"
            />
          </div>

          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Category
            </label>
            <CategoryChips
              categories={categories}
              selectedId={form.category_id}
              onSelect={(id) => updateField('category_id', id)}
              onAdd={isAdmin ? () => setShowCategoryModal(true) : undefined}
            />
          </div>

          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Description
            </label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => updateField('description', e.target.value || null)}
              placeholder="Describe the product for digital menus, allergens, or serving suggestions..."
              rows={3}
              className="w-full resize-none bg-transparent border-none p-0 text-sm text-on-body placeholder:text-on-surface-variant/30 focus:ring-0"
            />
          </div>

          {taxExemptEnabled && (
            <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tax_exempt}
                  onChange={(e) => updateField('tax_exempt', e.target.checked)}
                  className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                />
                <div>
                  <span className="block text-sm font-bold text-on-surface">Tax Exempt</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">This product is not subject to sales tax</span>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>

      {hasVariants && !form.is_bulk && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              <h2 className="font-headline font-bold text-xl text-on-surface">
                Variants & Extras
              </h2>
            </div>
          </div>

          <OptionGroupEditor
            groups={form.modifiers}
            onChange={(groups) => updateField('modifiers', groups)}
          />
        </div>
      )}

      {hasLoyalty && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h2 className="font-headline font-bold text-xl text-on-surface">Loyalty</h2>
          </div>

          <PointsInput
            value={form.points}
            onChange={(v) => updateField('points', v)}
            label={
              form.is_bulk
                ? `Points per ${form.bulk_unit || 'unit'} sold`
                : 'Points per Sale'
            }
          />
        </div>
      )}

      {trackInventory && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-tertiary" />
            <h2 className="font-headline font-bold text-xl text-on-surface">Inventory</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.track_inventory}
                  onChange={(e) => {
                    updateField('track_inventory', e.target.checked)
                    if (e.target.checked && form.stock_qty === null) {
                      updateField('stock_qty', 0)
                    }
                    if (e.target.checked && form.low_stock_threshold === null) {
                      updateField('low_stock_threshold', 10)
                    }
                  }}
                  className="h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
                />
                <div>
                  <span className="block text-sm font-bold text-on-surface">Track Inventory</span>
                  <span className="block text-xs text-on-surface-variant mt-0.5">Enable stock tracking and low-stock alerts for this product</span>
                </div>
              </label>
            </div>

            {form.track_inventory && (
              <>
                <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                    Stock Quantity{form.is_bulk && form.bulk_unit ? ` (${form.bulk_unit})` : ''}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={form.is_bulk ? 'any' : 1}
                    value={form.stock_qty ?? ''}
                    onChange={(e) =>
                      updateField('stock_qty', e.target.value ? parseFloat(e.target.value) : 0)
                    }
                    placeholder="0"
                    className="w-full bg-transparent border-none p-0 font-headline font-semibold text-on-surface text-lg focus:ring-0 placeholder:text-on-surface-variant/30"
                  />
                </div>

                <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.low_stock_threshold ?? ''}
                    onChange={(e) => updateField('low_stock_threshold', e.target.value ? parseInt(e.target.value, 10) : null)}
                    placeholder="10"
                    className="w-full bg-transparent border-none p-0 font-headline font-semibold text-on-surface text-lg focus:ring-0 placeholder:text-on-surface-variant/30"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <CreateCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        onCreated={handleCategoryCreated}
      />
    </form>
  )
}
