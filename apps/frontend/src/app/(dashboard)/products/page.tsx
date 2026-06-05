'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { api } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@ultimate-pos/shared'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: Product[] }>('/products')
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Modifiers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-on-surface-variant text-xs">
                      {product.modifiers?.length ?? 0} groups
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold font-headline ${
                          product.is_active
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/products/${product.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
