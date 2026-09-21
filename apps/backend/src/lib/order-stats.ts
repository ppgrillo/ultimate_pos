import type { SupabaseClient } from '@supabase/supabase-js'

// Fire-and-forget wrappers around the idempotent customer-stats RPCs.
// Errors are intentionally swallowed: the ledger dedupes by order_id, so a
// failed call self-corrects on the next transition for that order.
export function recordCustomerOrderStat(
  supabase: SupabaseClient,
  orderId: string,
  customerId: string,
  amount: number,
): void {
  supabase
    .rpc('record_customer_order_stat', {
      p_order_id: orderId,
      p_customer_id: customerId,
      p_amount: amount,
    })
    .then(
      () => {},
      (err) => {
        console.error('[order-stats] record_customer_order_stat failed', { orderId, customerId, amount, error: err })
      },
    )
}

export function unrecordCustomerOrderStat(supabase: SupabaseClient, orderId: string): void {
  supabase.rpc('unrecord_customer_order_stat', { p_order_id: orderId }).then(
    () => {},
    (err) => {
      console.error('[order-stats] unrecord_customer_order_stat failed', { orderId, error: err })
    },
  )
}