export type PassType = 'loyalty' | 'coupon' | 'gift_card'
export type PassStatus = 'active' | 'inactive' | 'suspended' | 'expired'

export interface DigitalPass {
  id: string
  store_id: string
  customer_id: string
  pass_type: PassType
  status: PassStatus
  google_pass_id: string | null
  apple_pass_id: string | null
  apple_serial_number: string | null
  barcode_value: string | null
  barcode_alt_text: string | null
  metadata: Record<string, unknown>
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface CreatePassInput {
  store_id: string
  customer_id: string
  pass_type: PassType
  barcode_value?: string
}

export interface UpdatePassInput {
  status?: PassStatus
  google_pass_id?: string
  apple_pass_id?: string
  apple_serial_number?: string
  barcode_value?: string
  barcode_alt_text?: string
  metadata?: Record<string, unknown>
  last_synced_at?: string
}
