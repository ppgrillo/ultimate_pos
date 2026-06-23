'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveTab } from '@/store/slices/orderSlice'
import type { OrderTab } from '@/store/slices/orderSlice'
import { OrderHeader, OrderList, OrderDetailModal, useOrderStream } from '@/components/orders'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Order, OrderStatus } from '@ultimate-pos/shared'
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from '@/store/api'

export default function OrdersPage() {
  const dispatch = useAppDispatch()
  const { activeTab } = useAppSelector((s) => s.order)
  const hasKitchen = useAppSelector((s) => s.storeConfig.currentStore?.settings?.hasKitchen ?? true)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [statusLoading, setStatusLoading] = useState<Record<string, boolean>>({})
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const { data: items = [], isFetching: loading } = useGetOrdersQuery(activeTab)
  const [updateOrderStatus] = useUpdateOrderStatusMutation()

  useOrderStream()

  useEffect(() => {
    const effectiveTab = !hasKitchen && activeTab === 'active' ? 'completed' : activeTab
    if (effectiveTab !== activeTab) {
      dispatch(setActiveTab(effectiveTab))
    }
  }, [dispatch, hasKitchen, activeTab])

  const handleTabChange = useCallback((tab: OrderTab) => {
    dispatch(setActiveTab(tab))
  }, [dispatch])

  const handleRefresh = useCallback(() => {
    void activeTab
  }, [activeTab])

  const handleStatusChange = useCallback(async (id: string, status: OrderStatus) => {
    if (status === 'cancelled') {
      setConfirmCancelId(id)
      return
    }
    setStatusLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await updateOrderStatus({ id, status }).unwrap()
    } finally {
      setStatusLoading((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }, [updateOrderStatus])

  const handleConfirmCancel = useCallback(async () => {
    if (!confirmCancelId) return
    const id = confirmCancelId
    setConfirmCancelId(null)
    setStatusLoading((prev) => ({ ...prev, [id]: true }))
    try {
      await updateOrderStatus({ id, status: 'cancelled' }).unwrap()
    } finally {
      setStatusLoading((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }, [updateOrderStatus, confirmCancelId])

  const handleTap = useCallback((order: Order) => {
    setDetailOrder(order)
  }, [])

  return (
    <div>
      <h1 className="font-headline text-headline-lg text-on-surface mb-6">Orders</h1>
      <OrderHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        orderCount={items.length}
        loading={loading}
        hasKitchen={hasKitchen}
      />
      <OrderList
        orders={items}
        hasKitchen={hasKitchen}
        loading={loading}
        statusLoading={statusLoading}
        onStatusChange={handleStatusChange}
        onTap={handleTap}
      />
      <OrderDetailModal
        order={detailOrder}
        open={detailOrder !== null}
        onOpenChange={(open) => { if (!open) setDetailOrder(null) }}
        hasKitchen={hasKitchen}
        onStatusChange={handleStatusChange}
        statusLoading={statusLoading}
      />

      <Modal open={confirmCancelId !== null} onOpenChange={(open) => { if (!open) setConfirmCancelId(null) }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Cancel Order</ModalTitle>
            <ModalDescription>Are you sure you want to cancel this order? This action cannot be undone.</ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setConfirmCancelId(null)}>No, keep it</Button>
            <Button variant="danger" onClick={handleConfirmCancel}>Yes, cancel order</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
