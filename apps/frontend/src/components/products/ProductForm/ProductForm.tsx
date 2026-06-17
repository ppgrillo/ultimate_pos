'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Sparkles, Package } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/products/ImageUpload'
import { CategoryChips } from '@/components/products/CategoryChips'
import { CreateCategoryModal } from '@/components/products/CreateCategoryModal'
import { OptionGroupEditor } from '@/components/products/OptionGroupEditor'
import { PointsInput } from '@/components/products/PointsInput'
import { useAppSelector } from '@/store/hooks'
import type { ModifierGroup } from '@ultimate-pos/shared'
import type { CreatedCategory } from '@/components/products/CreateCategoryModal'

interface ProductFormData {
  name: string
  price: number
  description: string | null
  category_id: string | null
  image_url: string | null
  modifiers: ModifierGroup[]
  points: number | null
  tax_exempt: boolean
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
  description: null,
  category_id: null,
  image_url: null,
  modifiers: [],
  points: null,
  tax_exempt: false,
}

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!productId
  const [form, setForm] = useState<ProductFormData>(initialData ?? defaultForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = userRole === 'admin'
  const storeSettings = useAppSelector((state) => state.storeConfig.currentStore?.settings)
  const hasVariants = storeSettings?.hasVariants ?? false
  const hasLoyalty = storeSettings?.hasLoyalty ?? false
  const taxExemptEnabled = storeSettings?.taxExemptEnabled ?? false

  useEffect(() => {
    api.get<{ data: Category[] }>('/categories').then((res) => {
      setCategories(res.data)
    }).catch(() => {
      // categories endpoint may not exist yet
    })
  }, [])

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
        description: form.description,
        category_id: form.category_id,
        image_url: form.image_url,
        modifiers: cleanModifiers,
        points: form.points ?? 0,
        tax_exempt: form.tax_exempt,
      }

      if (isEditing) {
        await api.put(`/products/${productId}`, payload)
      } else {
        await api.post('/products', payload)
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
            onClick={() => router.back()}
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
        <Button type="submit" disabled={saving || !form.name || form.price <= 0} isLoading={saving}>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Update' : 'Save'}
        </Button>
      </div>

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
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-headline font-bold text-xl text-on-surface">Basic Info</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-surface-container/50 border border-outline-variant p-4 md:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
              Product Name
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

      {hasVariants && (
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
          />
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
