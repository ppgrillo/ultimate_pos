'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { ProductMobileCard } from '@/components/products/ProductMobileCard'
import { api } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import type { Product, ProductCategory } from '@ultimate-pos/shared'

interface ProductRow {
  id: string
  name: string
  price: number
  modifiers: number
  category: string
  is_active: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  useEffect(() => {
    Promise.all([
      api.get<{ data: Product[] }>('/products'),
      api.get<{ data: ProductCategory[] }>('/categories'),
    ])
      .then(([productsRes, categoriesRes]) => {
        setProducts(productsRes.data)
        setCategories(categoriesRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rows: ProductRow[] = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        modifiers: p.modifiers?.length ?? 0,
        category: p.category_id ? categoryMap.get(p.category_id) ?? '-' : '-',
        is_active: p.is_active,
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

  const columns: ColumnDef<ProductRow, any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
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
    {
      accessorKey: 'modifiers',
      header: 'Modifiers',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-on-surface-variant text-xs">
          {row.getValue<number>('modifiers')} groups
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
        <Link href="/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
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
          <span className="text-sm text-on-surface-variant">{products.length} total</span>
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

      {/* Mobile view */}
      <div className="lg:hidden space-y-3 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
          groupedByCategory.map(({ category, products }) => (
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
                  />
                ))}
              </div>
            </div>
          ))
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
            {loading ? (
              <p className="text-on-surface-variant">Loading products...</p>
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
                data={rows}
                searchable
                searchPlaceholder="Search products..."
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
