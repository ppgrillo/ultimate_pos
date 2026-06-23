'use client'

import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { api } from '@/store/api'

export function useOrderStream() {
  const dispatch = useAppDispatch()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (esRef.current) return

    const es = new EventSource('/api/orders/realtime')
    esRef.current = es

    es.onmessage = (event) => {
      try {
        JSON.parse(event.data)
        dispatch(api.util.invalidateTags([{ type: 'Order', id: 'LIST' }]))
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
