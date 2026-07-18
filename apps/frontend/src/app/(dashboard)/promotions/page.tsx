'use client'

import { useState } from 'react'
import { Plus, Tag } from 'lucide-react'
import { useGetPromotionsQuery } from '@/store/api'
import { Button } from '@/components/ui/Button'
import { PromotionList, PromotionForm } from '@/components/promotions'
import type { Promotion } from '@ultimate-pos/shared'

export default function PromotionsPage() {
  const { data: promotions = [], isLoading: loading, refetch } = useGetPromotionsQuery()
  const [showForm, setShowForm] = useState(false)
  const [editPromotion, setEditPromotion] = useState<Promotion | null>(null)

  const handleEdit = (promotion: Promotion) => {
    setEditPromotion(promotion)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditPromotion(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Promotions</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Create automatic discounts for your products, categories, or entire cart.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            {/* Note: RefreshCw removed since RTK Query handles refetch */}
          </Button>
          <Button onClick={() => { setEditPromotion(null); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Promotion
          </Button>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
        <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-3">
          Promotion Types
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span><strong className="text-on-surface">Product</strong> — individual item discount</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span><strong className="text-on-surface">Category</strong> — all items in a category</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span><strong className="text-on-surface">Quantity</strong> — buy X or more items</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
            <span><strong className="text-on-surface">Subtotal</strong> — spend minimum amount</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <PromotionList
          promotions={promotions}
          onUpdated={() => refetch()}
          onDeleted={() => refetch()}
          onEdit={handleEdit}
        />
      )}

      <PromotionForm
        open={showForm}
        onOpenChange={handleFormClose}
        onSaved={() => refetch()}
        editPromotion={editPromotion}
      />
    </div>
  )
}