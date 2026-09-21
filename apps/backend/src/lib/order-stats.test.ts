import { describe, it, expect, vi } from 'vitest'
import { recordCustomerOrderStat, unrecordCustomerOrderStat } from './order-stats'

function thenable(resolveWith?: unknown, rejectWith?: unknown) {
  return {
    then(onFulfilled?: (v: unknown) => void, onRejected?: (err: unknown) => void) {
      if (rejectWith !== undefined) onRejected?.(rejectWith)
      else onFulfilled?.(resolveWith)
      return thenable()
    },
  }
}

describe('order-stats helpers', () => {
  it('calls record_customer_order_stat with the right args and resolves silently', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = { rpc: vi.fn(() => thenable({ ok: true })) } as any

    expect(() => recordCustomerOrderStat(supabase, 'order-1', 'customer-1', 125.5)).not.toThrow()
    expect(supabase.rpc).toHaveBeenCalledWith('record_customer_order_stat', {
      p_order_id: 'order-1',
      p_customer_id: 'customer-1',
      p_amount: 125.5,
    })
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('calls unrecord_customer_order_stat with the right args and resolves silently', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = { rpc: vi.fn(() => thenable({ ok: true })) } as any

    expect(() => unrecordCustomerOrderStat(supabase, 'order-1')).not.toThrow()
    expect(supabase.rpc).toHaveBeenCalledWith('unrecord_customer_order_stat', { p_order_id: 'order-1' })
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('logs the failure without throwing when the RPC rejects', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boom = { message: 'rpc failed' }
    const supabase = { rpc: vi.fn(() => thenable(undefined, boom)) } as any

    expect(() => recordCustomerOrderStat(supabase, 'order-1', 'customer-1', 10)).not.toThrow()
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError.mock.calls[0][0]).toContain('[order-stats] record_customer_order_stat failed')
    expect(consoleError.mock.calls[0][1]).toEqual(expect.objectContaining({ orderId: 'order-1', error: boom }))

    expect(() => unrecordCustomerOrderStat(supabase, 'order-1')).not.toThrow()
    expect(consoleError.mock.calls[1][0]).toContain('[order-stats] unrecord_customer_order_stat failed')
    consoleError.mockRestore()
  })
})