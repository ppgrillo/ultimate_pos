'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { orderUpdated } from '@/store/slices/orderSlice'
import type { Order } from '@ultimate-pos/shared'

export function useOrderStream() {
  const dispatch = useAppDispatch()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (esRef.current) return

    const es = new EventSource('/api/orders/realtime')
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const order: Order = JSON.parse(event.data)
        dispatch(orderUpdated(order))
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      // EventSource auto-reconnects
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [dispatch])
}
