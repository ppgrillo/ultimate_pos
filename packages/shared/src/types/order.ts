import type { Payment } from './customer'
import type { AppliedPromotion } from './promotion'
import type { RewardType } from './loyalty'

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled' | 'refunded'

export type OrderType = 'dine-in' | 'takeaway' | 'delivery'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Order {
  id: string
  store_id: string
  check_id?: string | null
  round_number?: number | null
  customer_id: string | null
  created_by: string
  table_number: number | null
  order_number: number | null
  status: OrderStatus
  type: OrderType
  payment_status: PaymentStatus
  subtotal: number
  tax: number
  discount: number
  promo_discount: number
  applied_promotions: AppliedPromotion[]
  total: number
  items: OrderItem[]
  payments?: Payment[]
  customer_name?: string | null
  notes: string | null
  metadata: OrderMetadata
  loyalty?: { earned: number; redeemed: number } | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name?: string
  quantity: number
  unit_price: number
  modifiers: string[]
  notes: string | null
}

export interface OrderStatusTransition {
  from: OrderStatus
  to: OrderStatus
  label: string
}

export type KitchenWorkflowStepStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'paid'

export interface KitchenWorkflowStepConfig {
  status: KitchenWorkflowStepStatus
  label: string
  enabled: boolean
}

export type KitchenWorkflowConfig = KitchenWorkflowStepConfig[]

const DEFAULT_KITCHEN_STEP_META: Record<KitchenWorkflowStepStatus, Omit<KitchenWorkflowStepConfig, 'status'>> = {
  pending: {
    label: 'Pending',
    enabled: true,
  },
  preparing: {
    label: 'Preparing',
    enabled: false,
  },
  ready: {
    label: 'Ready to Serve',
    enabled: false,
  },
  served: {
    label: 'Mark Served',
    enabled: true,
  },
  paid: {
    label: 'Paid',
    enabled: true,
  },
}

const KITCHEN_STATUS_ORDER: KitchenWorkflowStepStatus[] = ['pending', 'preparing', 'ready', 'served', 'paid']

export const DEFAULT_KITCHEN_WORKFLOW: KitchenWorkflowConfig = KITCHEN_STATUS_ORDER.map((status) => ({
  status,
  ...DEFAULT_KITCHEN_STEP_META[status],
}))

function isKitchenStepStatus(value: unknown): value is KitchenWorkflowStepStatus {
  return typeof value === 'string' && KITCHEN_STATUS_ORDER.includes(value as KitchenWorkflowStepStatus)
}

function normalizeLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

export function resolveKitchenWorkflow(config?: KitchenWorkflowConfig | null): KitchenWorkflowConfig {
  const hasCustomConfig = Array.isArray(config) && config.length > 0
  const byStatus = new Map<KitchenWorkflowStepStatus, KitchenWorkflowStepConfig>()

  for (const status of KITCHEN_STATUS_ORDER) {
    byStatus.set(status, {
      status,
      ...DEFAULT_KITCHEN_STEP_META[status],
      enabled: hasCustomConfig
        ? (status === 'pending' || status === 'served' || status === 'paid')
        : DEFAULT_KITCHEN_STEP_META[status].enabled,
    })
  }

  if (Array.isArray(config)) {
    for (const raw of config) {
      if (!raw || !isKitchenStepStatus((raw as KitchenWorkflowStepConfig).status)) continue
      const status = raw.status
      const defaults = DEFAULT_KITCHEN_STEP_META[status]
      byStatus.set(status, {
        status,
        label: normalizeLabel(raw.label, defaults.label),
        enabled: status === 'pending' || status === 'served' || status === 'paid' ? true : raw.enabled !== false,
      })
    }
  }

  return KITCHEN_STATUS_ORDER.map((status) => {
    const step = byStatus.get(status)
    if (!step) {
      return { status, ...DEFAULT_KITCHEN_STEP_META[status] }
    }
    return {
      status: step.status,
      label: step.label,
      enabled: step.status === 'pending' || step.status === 'served' || step.status === 'paid' ? true : step.enabled,
    }
  }).map((step) => ({
    ...step,
    enabled: step.status === 'pending' || step.status === 'served' || step.status === 'paid' ? true : step.enabled,
  }))
}

export function getKitchenTimeline(config?: KitchenWorkflowConfig | null): KitchenWorkflowStepStatus[] {
  const resolved = resolveKitchenWorkflow(config)
  return resolved
    .filter((step) => step.enabled)
    .map((step) => step.status)
}

export function getKitchenStatusLabel(status: KitchenWorkflowStepStatus, config?: KitchenWorkflowConfig | null): string {
  const step = resolveKitchenWorkflow(config).find((item) => item.status === status)
  return step?.label || DEFAULT_KITCHEN_STEP_META[status].label
}

export const KITCHEN_FLOW: OrderStatusTransition[] = [
  { from: 'pending',   to: 'preparing', label: 'Preparing' },
  { from: 'preparing', to: 'ready',     label: 'Ready to Serve' },
  { from: 'ready',     to: 'served',    label: 'Mark Served' },
]

export function getNextKitchenTransitions(current: OrderStatus, workflow?: KitchenWorkflowConfig | null): OrderStatusTransition[] {
  const resolved = resolveKitchenWorkflow(workflow)
  const currentIndex = resolved.findIndex((step) => step.status === current)
  const nextEnabledSteps = currentIndex >= 0
    ? resolved.slice(currentIndex + 1).filter((step) => step.enabled)
    : []

  const firstEnabled = nextEnabledSteps[0]
  const nextStep = firstEnabled && firstEnabled.status !== 'paid' ? firstEnabled : null
  const next = nextStep
    ? [{ from: current, to: nextStep.status, label: nextStep.label }]
    : []

  return [
    ...next,
    { from: current, to: 'cancelled', label: 'Cancel Order' },
    ...(current === 'served' || current === 'paid' ? [{ from: current, to: 'refunded' as OrderStatus, label: 'Refund' }] : []),
  ]
}

export function getNextRetailTransitions(current: OrderStatus): OrderStatusTransition[] {
  if (current === 'pending') {
    return [
      { from: 'pending', to: 'paid', label: 'Mark as Paid' },
      { from: 'pending', to: 'cancelled', label: 'Cancel Order' },
    ]
  }
  if (current === 'paid') {
    return [
      { from: 'paid', to: 'refunded', label: 'Refund' },
      { from: 'paid', to: 'cancelled', label: 'Void' },
    ]
  }
  return []
}

export function canTransition(from: OrderStatus, to: OrderStatus, hasKitchen: boolean, workflow?: KitchenWorkflowConfig | null): boolean {
  if (to === 'cancelled' || to === 'refunded') return true
  const transitions = hasKitchen ? getNextKitchenTransitions(from, workflow) : getNextRetailTransitions(from)
  return transitions.some(t => t.from === from && t.to === to)
}

export interface OrderMetadata {
  [key: string]: unknown
  mpOrderId?: string
  mpOrderStatus?: 'created' | 'at_terminal' | 'processing' | 'processed' | 'failed' | 'expired' | 'canceled' | 'refunded' | 'action_required'
  mpStatusDetail?: string
  redeemedRewardId?: string
  redeemedRewardName?: string
  redeemedRewardType?: RewardType
  redeemedRewardPoints?: number
  redeemedRewardDiscount?: number
}
