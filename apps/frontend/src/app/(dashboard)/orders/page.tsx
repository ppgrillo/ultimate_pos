'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveTab } from '@/store/slices/orderSlice'
import type { OrderTab } from '@/store/slices/orderSlice'
import { OrderHeader, OrderList, OrderDetailModal, useOrderStream } from '@/components/orders'
import { Pagination } from '@/components/ui/Pagination'
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
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const queryParams = useMemo(() => ({
    tab: activeTab,
    limit: pageSize,
    offset: page * pageSize,
  }), [activeTab, page, pageSize])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPage(0)
  }, [])

  const { data: result, isFetching: loading, isError, refetch } = useGetOrdersQuery(queryParams)
  const items = result?.items ?? []
  const totalOrders = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize))
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
    setPage(0)
  }, [dispatch])

  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

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
    <div className="flex flex-col h-full overflow-hidden">
      <h1 className="font-headline text-headline-lg text-on-surface mb-6 shrink-0">Orders</h1>
      <OrderHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        orderCount={items.length}
        loading={loading}
        hasKitchen={hasKitchen}
      />
      <div className="flex-1 overflow-y-auto min-h-0">
        <OrderList
          orders={items}
          hasKitchen={hasKitchen}
          loading={loading}
          error={isError}
          statusLoading={statusLoading}
          onStatusChange={handleStatusChange}
          onTap={handleTap}
          onRetry={refetch}
        />
      </div>
      {!hasKitchen && (
        <div className="shrink-0 pt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalOrders}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
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
