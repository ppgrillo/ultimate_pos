'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCustomizeProductId } from '@/store/slices/posSlice'
import { addItem } from '@/store/slices/cartSlice'
import { ExpandableText } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useGetProductsQuery } from '@/store/api'

export function CustomizeProduct() {
  const dispatch = useAppDispatch()
  const productId = useAppSelector((s) => s.pos.customizeProductId)
  const sliceProducts = useAppSelector((s) => s.products.items)
  const { data: queryProducts = [] } = useGetProductsQuery()
  const product = queryProducts.find((p) => p.id === productId)
    ?? sliceProducts.find((p) => p.id === productId)

  const [imgError, setImgError] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const specialInstructionsEnabled = useAppSelector((s) => s.storeConfig.currentStore?.settings?.specialInstructionsEnabled ?? true)

  useEffect(() => {
    if (product?.modifiers) {
      const initial: Record<string, string[]> = {}
      product.modifiers.forEach((group) => {
        if (group.type === 'single' && group.is_required && group.options.length > 0) {
          initial[group.name] = [group.options[0].name]
        } else {
          initial[group.name] = []
        }
      })
      setSelectedOptions(initial)
    }
  }, [product])

  const handleClose = useCallback(() => {
    dispatch(setCustomizeProductId(null))
  }, [dispatch])

  if (!product) return null

  const toggleOption = (groupName: string, optionName: string, type: 'single' | 'multi') => {
    setSelectedOptions((prev) => {
      const current = prev[groupName] || []
      if (type === 'single') {
        return { ...prev, [groupName]: current.includes(optionName) ? [] : [optionName] }
      }
      return {
        ...prev,
        [groupName]: current.includes(optionName)
          ? current.filter((o) => o !== optionName)
          : [...current, optionName],
      }
    })
  }

  const allSelectedOptions = Object.values(selectedOptions).flat()
  const modifiersPrice = product.modifiers?.reduce((total, group) => {
    const selected = selectedOptions[group.name] || []
    return total + group.options
      .filter((o) => selected.includes(o.name))
      .reduce((sum, o) => sum + o.price_adjustment, 0)
  }, 0) || 0

  const itemTotal = (product.price + modifiersPrice) * quantity

  const handleAddToCart = () => {
    const variantParts: string[] = Object.entries(selectedOptions)
      .filter(([, options]) => options.length > 0)
      .map(([, options]) => options.join(', '))

    dispatch(addItem({
      product_id: product.id,
      name: product.name,
      price: product.price + modifiersPrice,
      quantity,
      variant_label: variantParts.length > 0 ? variantParts.join(' · ') : '',
      modifiers: allSelectedOptions,
      notes: notes || null,
    }))
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-surface-container p-0 shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-container p-4 border-b border-outline-variant">
          <h2 className="font-headline font-bold text-lg text-on-surface">Customize</h2>
          <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div className="flex gap-4">
            {product.image_url && !imgError && (
              <div className="shrink-0">
                <img
                  src={product.image_url ?? undefined}
                  alt={product.name}
                  className="h-24 w-24 rounded-xl object-cover"
                  onError={() => setImgError(true)}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {(product.points ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-label font-bold text-secondary">
                        +{product.points} pts
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline font-bold text-xl text-on-surface">{product.name}</h3>
                  <p className="font-headline font-bold text-lg text-primary mt-1">{formatCurrency(product.price)}</p>
                </div>
              </div>
              {product.description && (
                <ExpandableText text={product.description} className="mt-2 text-sm text-on-surface-variant" />
              )}
            </div>
          </div>

          {product.modifiers?.map((group) => (
            <div key={group.name}>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                  {group.name}
                </h4>
                {group.is_required && (
                  <span className="text-[10px] text-error">Required</span>
                )}
              </div>
              <div className="space-y-1">
                {group.options.map((option) => {
                  const isSelected = (selectedOptions[group.name] || []).includes(option.name)
                  return (
                    <button
                      key={option.name}
                      onClick={() => toggleOption(group.name, option.name, group.type)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30 text-on-surface'
                          : 'bg-surface-container-high border border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          isSelected ? 'border-primary bg-primary' : 'border-outline'
                        }`}>
                          {isSelected && group.type === 'single' && (
                            <div className="h-2 w-2 rounded-full bg-primary-on" />
                          )}
                          {isSelected && group.type === 'multi' && (
                            <span className="text-[10px] text-primary-on font-bold">✓</span>
                          )}
                        </div>
                        <span>{option.name}</span>
                      </div>
                      {option.price_adjustment > 0 && (
                        <span className="text-xs text-on-surface-variant">+{formatCurrency(option.price_adjustment)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {specialInstructionsEnabled && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                  Special Instructions
                </h4>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests?"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[60px] resize-none"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
                Quantity
              </h4>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-headline font-bold text-lg text-on-surface w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface hover:bg-surface-container"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-outline-variant bg-surface-container p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-on-surface-variant">Item Total</span>
            <span className="font-headline font-bold text-lg text-on-surface">{formatCurrency(itemTotal)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border border-outline-variant py-2.5 text-sm font-label font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-label font-bold text-primary-on hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
