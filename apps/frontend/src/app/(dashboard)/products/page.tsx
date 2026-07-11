'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Search, X, Upload, Trash2, CheckSquare, Square, ImagePlus, PackageOpen, Pin, PinOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { proxyImageUrl } from '@/lib/image-proxy'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/DataTable'
import { ProductMobileCard } from '@/components/products/ProductMobileCard'
import { ImportModal } from '@/components/products/ImportModal'
import { BulkImageUpload } from '@/components/products/BulkImageUpload'
import { formatCurrency } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'
import type { ColumnDef } from '@tanstack/react-table'
import { useDeleteProductsBatchMutation, useGetCategoriesQuery, useGetProductsQuery, useToggleProductPinMutation } from '@/store/api'

interface ProductRow {
  id: string
  name: string
  price: number
  image_url: string | null
  modifiers: number
  category: string
  is_active: boolean
  pinned: boolean
  stock_qty: number | null
  track_inventory: boolean
  low_stock_threshold: number | null
}

function ProductAvatar({ imageUrl }: { imageUrl: string | null }) {
  const [error, setError] = useState(false)
  const showImg = imageUrl && !error
  return (
    <>
      {showImg ? (
        <img
          src={proxyImageUrl(imageUrl) ?? undefined}
          alt=""
          className="h-9 w-9 rounded-lg object-cover bg-surface-container-high shrink-0"
          onError={() => setError(true)}
        />
      ) : (
        <div className="h-9 w-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
          <PackageOpen className="h-4 w-4 text-on-surface-variant/40" />
        </div>
      )}
    </>
  )
}

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showBulkImageUpload, setShowBulkImageUpload] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = userRole === 'admin'
  const trackInventoryGlobal = useAppSelector((s) => s.storeConfig.currentStore?.settings?.trackInventory ?? false)
  const { data: products = [], isLoading } = useGetProductsQuery()
  const { data: categories = [] } = useGetCategoriesQuery()
  const [deleteProductsBatch] = useDeleteProductsBatchMutation()
  const [toggleProductPin] = useToggleProductPinMutation()

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  const rows: ProductRow[] = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url,
        modifiers: p.modifiers?.length ?? 0,
        category: p.category_id ? categoryMap.get(p.category_id) ?? '-' : '-',
        is_active: p.is_active,
        pinned: p.pinned,
        stock_qty: p.stock_qty,
        track_inventory: p.track_inventory,
        low_stock_threshold: p.low_stock_threshold,
      })),
    [products, categoryMap],
  )

  const filtered = useMemo(
    () =>
      search
        ? rows.filter(
            (r) =>
              r.name.toLowerCase().includes(search.toLowerCase()) ||
              r.category.toLowerCase().includes(search.toLowerCase()),
          )
        : rows,
    [rows, search],
  )

  const pageProductIds = useMemo(() => filtered.map((r) => r.id), [filtered])

  const allSelected = pageProductIds.length > 0 && pageProductIds.every((id) => selectedIds.has(id))
  const someSelected = pageProductIds.some((id) => selectedIds.has(id))

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageProductIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        pageProductIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const clearSelection = () => setSelectedIds(new Set())

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      await deleteProductsBatch({ ids: Array.from(selectedIds) }).unwrap()
      clearSelection()
      setShowDeleteConfirm(false)
    } catch {
      // error handled silently
    } finally {
      setDeleting(false)
    }
  }

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, ProductRow[]>()
    for (const p of filtered) {
      const cat = p.category === '-' ? 'Uncategorized' : p.category
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(p)
    }
    return Array.from(groups.entries())
      .map(([category, products]) => ({
        category,
        products: products.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  }, [filtered])

  const selectColumn: ColumnDef<ProductRow, any> = {
    id: 'select',
    header: () => (
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
        onChange={toggleSelectAll}
        className="h-4 w-4 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={selectedIds.has(row.original.id)}
        onChange={() => toggleSelect(row.original.id)}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary"
      />
    ),
    enableSorting: false,
  }

  const columns: ColumnDef<ProductRow, any>[] = [
    selectColumn,
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      cell: ({ row }) => {
        const p = row.original as ProductRow
        return (
          <div className="flex items-center gap-3">
            <ProductAvatar imageUrl={p.image_url} />
            <span className="font-bold text-on-surface truncate">{p.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      enableSorting: true,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      enableSorting: true,
      cell: ({ row }) => formatCurrency(row.getValue('price')),
    },
    ...(trackInventoryGlobal
      ? [
          {
            accessorKey: 'stock_qty',
            header: 'Stock',
            enableSorting: true,
            cell: ({ row }: { row: any }) => {
              const p = row.original as ProductRow
              if (!p.track_inventory) return <span className="text-on-surface-variant/40">—</span>
              const isLow = p.low_stock_threshold != null && p.stock_qty != null && p.stock_qty <= p.low_stock_threshold
              return (
                <div className="flex items-center gap-2">
                  <span className={isLow ? 'text-error font-bold' : ''}>
                    {p.stock_qty ?? 0}
                  </span>
                  {isLow && (
                    <span className="inline-flex items-center rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-bold text-error">
                      Low
                    </span>
                  )}
                </div>
              )
            },
          } as ColumnDef<ProductRow, any>,
        ]
      : []),
    {
      accessorKey: 'modifiers',
      header: 'Var.',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-on-surface-variant text-xs">
          {row.getValue<number>('modifiers')}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      enableSorting: true,
      cell: ({ row }) => {
        const active = row.getValue<boolean>('is_active')
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold font-headline ${
              active
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        )
      },
    },
    {
      id: 'pinned',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original as ProductRow
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleProductPin({ id: p.id })
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
            title={p.pinned ? 'Unpin' : 'Pin'}
          >
            {p.pinned ? (
              <Pin className="h-4 w-4 fill-primary text-primary" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </button>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/products/${row.original.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Products</h1>
          <p className="text-on-surface-variant text-sm">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={() => setShowBulkImageUpload(true)}>
                <ImagePlus className="h-4 w-4 mr-2" />
                Upload Images
              </Button>
            </>
          )}
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-headline text-headline-lg text-on-surface">Products</h1>
            <Link
              href="/products/new"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-on transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-sm text-on-surface-variant">{selectedIds.size} selected</span>
            )}
            <span className="text-sm text-on-surface-variant">{products.length} total</span>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container pl-9 pr-9 text-sm text-on-body placeholder:text-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-surface-container-high border border-outline-variant px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={clearSelection} className="text-on-surface-variant hover:text-on-surface">
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-on-surface">
              {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-primary hover:underline"
            >
              Clear selection
            </button>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Mobile view */}
      <div className="lg:hidden space-y-3 pb-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/30 p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-on-surface-variant mb-4">
              {search ? 'No products match your search' : 'No products yet'}
            </p>
            {!search && (
              <Link href="/products/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first product
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {filtered.length > 1 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-on-surface px-1"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
            {groupedByCategory.map(({ category, products }) => (
              <div key={category}>
                <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant px-1 py-2">
                  {category}
                  <span className="ml-2 font-normal text-on-surface-variant/60">
                    {products.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {products.map((p) => (
                    <ProductMobileCard
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      price={p.price}
                      category=""
                      isActive={p.is_active}
                      pinned={p.pinned}
                      selected={selectedIds.has(p.id)}
                      onToggle={toggleSelect}
                      onPinToggle={(id) => toggleProductPin({ id })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle>All Products</CardTitle>
            <CardDescription>
              {products.length} product{products.length !== 1 ? 's' : ''} in your catalog
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-3">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-t border-outline-variant/20">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-on-surface-variant mb-4">No products yet</p>
                <Link href="/products/new">
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first product
                  </Button>
                </Link>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filtered}
                searchable
                searchPlaceholder="Search products..."
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onComplete={() => void 0}
      />

      <BulkImageUpload
        open={showBulkImageUpload}
        onOpenChange={setShowBulkImageUpload}
        onComplete={() => void 0}
      />

      {/* Delete confirmation modal */}
      <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Delete {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''}?</ModalTitle>
            <ModalDescription>
              This action cannot be undone. The selected products will be permanently removed from your catalog.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} isLoading={deleting}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
