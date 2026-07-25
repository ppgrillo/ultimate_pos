'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'

export default function OrdersPage() {
  const router = useRouter()
  const hasKitchen = useAppSelector((s) => s.storeConfig.currentStore?.settings?.hasKitchen)

  useEffect(() => {
    if (hasKitchen === undefined) return
    router.replace(hasKitchen ? '/orders/kitchen' : '/orders/sales')
  }, [hasKitchen, router])

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-on-surface-variant">Loading orders...</p>
    </div>
  )
}
