'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useGetProductsQuery } from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { EventParams } from '@/components/simulaciones/EventParams'
import { CatalogOverview } from '@/components/simulaciones/CatalogOverview'
import { WhatIfAnalysis } from '@/components/simulaciones/WhatIfAnalysis'
import { BreakEvenAnalysis } from '@/components/simulaciones/BreakEvenAnalysis'
import { Throughput } from '@/components/simulaciones/Throughput'
import {
  DEFAULT_PARAMS,
  STORAGE_KEY,
  buildCatalog,
  type SimulationParams,
} from '@/lib/simulaciones/calculations'
import { Package, ArrowRight } from 'lucide-react'

function loadParams(): SimulationParams {
  if (typeof window === 'undefined') return DEFAULT_PARAMS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PARAMS
    const parsed = JSON.parse(raw) as Partial<SimulationParams>
    return { ...DEFAULT_PARAMS, ...parsed, productMargins: parsed.productMargins ?? {} }
  } catch {
    return DEFAULT_PARAMS
  }
}

export default function SimulationsPage() {
  const { data: products = [], isLoading } = useGetProductsQuery()
  const currency = useAppSelector((s) => s.storeConfig.currentStore?.currency) || 'MXN'

  const [loaded, setLoaded] = useState(false)
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS)

  useEffect(() => {
    setParams(loadParams())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params))
  }, [params, loaded])

  const activeProducts = useMemo(() => products.filter((p) => p.is_active), [products])
  const catalog = useMemo(
    () => buildCatalog(activeProducts, params.marginPercent, params.productMargins),
    [activeProducts, params.marginPercent, params.productMargins],
  )

  // Default to the real average margin when the user hasn't picked one yet.
  useEffect(() => {
    if (loaded && catalog.realAvgMarginPercent != null) {
      setParams((prev) => {
        if (prev.marginPercent !== DEFAULT_PARAMS.marginPercent) return prev
        return { ...prev, marginPercent: catalog.realAvgMarginPercent! }
      })
    }
  }, [loaded, catalog.realAvgMarginPercent])

  const patchParams = (patch: Partial<SimulationParams>) =>
    setParams((prev) => ({ ...prev, ...patch }))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-full max-w-lg" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-surface-container/30 border border-outline-variant/30 p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (catalog.count === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-headline-lg text-on-surface">Event simulations</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            See if a bazar or event is worth it before you pay.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Package className="h-10 w-10 text-on-surface-variant/40 mb-3" />
            <p className="font-headline text-headline-md text-on-surface">No sellable products yet</p>
            <p className="text-sm text-on-surface-variant mt-1 mb-5 max-w-md">
              Add products with a price to start simulating volumes, break-even and star products.
            </p>
            <Link
              href="/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-label font-bold text-primary-on transition-colors hover:bg-primary/80"
            >
              Add product <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Simulations</p>
        <h1 className="font-headline text-headline-lg text-on-surface">Event simulations</h1>
        <p className="text-sm text-on-surface-variant">
          Decide if a bazar or event is worth it before you pay — using your real products and numbers.
        </p>
      </div>

      <EventParams
        params={params}
        onChange={patchParams}
        estimatedCount={catalog.estimatedCount}
        avgMarginPercent={catalog.realAvgMarginPercent}
        realCostCount={catalog.realCostCount}
      />

      <CatalogOverview catalog={catalog} params={params} currency={currency} />

      <Tabs defaultValue="what-if">
        <TabsList>
          <TabsTrigger value="what-if">What if…?</TabsTrigger>
          <TabsTrigger value="break-even">What you need</TabsTrigger>
          <TabsTrigger value="time">Time &amp; team</TabsTrigger>
        </TabsList>
        <TabsContent value="what-if">
          <WhatIfAnalysis catalog={catalog} params={params} currency={currency} onChange={patchParams} />
        </TabsContent>
        <TabsContent value="break-even">
          <BreakEvenAnalysis
            catalog={catalog}
            params={params}
            currency={currency}
            onChange={patchParams}
          />
        </TabsContent>
        <TabsContent value="time">
          <Throughput catalog={catalog} params={params} currency={currency} onChange={patchParams} />
        </TabsContent>
      </Tabs>
    </div>
  )
}