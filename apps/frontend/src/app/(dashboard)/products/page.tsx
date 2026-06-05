'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
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
      <div className="flex items-center justify-between">
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
  )
}
