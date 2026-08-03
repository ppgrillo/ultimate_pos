'use client'

import { useState } from 'react'
import { Gift, Plus, Pencil, Trash2, Power, PowerOff, Calendar, ChevronDown } from 'lucide-react'
import { useGetRewardsQuery, useCreateRewardMutation, useUpdateRewardMutation, useDeleteRewardMutation, useToggleRewardMutation } from '@/store/api'
import { useGetProductsQuery } from '@/store/api'
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DateField } from '@/components/ui/DateField'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import type { LoyaltyReward, RewardType } from '@ultimate-pos/shared'

const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  free_product: 'Free Product',
  percentage_discount: 'Percentage Discount',
  fixed_discount: 'Fixed Discount',
  custom: 'Custom',
}

const REWARD_TYPE_DESCRIPTIONS: Record<RewardType, string> = {
  free_product: 'Customer gets a specific product for free',
  percentage_discount: 'Discount off the order total by percentage',
  fixed_discount: 'Discount off the order total by a fixed amount',
  custom: 'Custom reward handled manually',
}

interface RewardFormData {
  name: string
  description: string
  reward_type: RewardType
  points_required: number
  product_id: string
  discount_value: number
  discount_type: 'percentage' | 'fixed'
  max_uses: number
  starts_at: string
  ends_at: string
}

const emptyForm: RewardFormData = {
  name: '',
  description: '',
  reward_type: 'free_product',
  points_required: 100,
  product_id: '',
  discount_value: 0,
  discount_type: 'percentage',
  max_uses: 0,
  starts_at: '',
  ends_at: '',
}

type RewardStatus = 'active' | 'scheduled' | 'expired' | 'inactive'

const STATUS_CHIP: Record<RewardStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/15 text-success' },
  scheduled: { label: 'Scheduled', className: 'bg-primary/15 text-primary' },
  expired: { label: 'Expired', className: 'bg-error/15 text-error' },
  inactive: { label: 'Inactive', className: 'bg-on-surface/10 text-on-surface-variant' },
}

function getRewardStatus(reward: LoyaltyReward): RewardStatus {
  if (reward.ends_at && new Date(reward.ends_at).getTime() < Date.now()) return 'expired'
  if (reward.starts_at && new Date(reward.starts_at).getTime() > Date.now()) return 'scheduled'
  return reward.is_active ? 'active' : 'inactive'
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function localOffsetFor(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const tz = -d.getTimezoneOffset()
  const sign = tz >= 0 ? '+' : '-'
  const abs = Math.abs(tz)
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

function toDateInput(value: string, kind: 'start' | 'end'): string | null {
  if (!value) return null
  if (value.includes('T')) return value
  const time = kind === 'start' ? '00:00:00' : '23:59:59'
  return `${value}T${time}${localOffsetFor(value)}`
}

function toLocalDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function RewardsPage() {
  const userRole = useAppSelector((state) => state.auth.user?.role)
  const isAdmin = userRole === 'admin'

  const { data: rewards = [], isLoading, refetch } = useGetRewardsQuery()
  const { data: products = [] } = useGetProductsQuery()
  const [createReward] = useCreateRewardMutation()
  const [updateReward] = useUpdateRewardMutation()
  const [deleteReward] = useDeleteRewardMutation()
  const [toggleReward] = useToggleRewardMutation()

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<RewardFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expiredOpen, setExpiredOpen] = useState(false)
  const [inactiveOpen, setInactiveOpen] = useState(false)

  const resetForm = () => {
    setForm(emptyForm)
    setEditId(null)
    setError(null)
  }

  const handleEdit = (reward: LoyaltyReward) => {
    setEditId(reward.id)
    setForm({
      name: reward.name,
      description: reward.description || '',
      reward_type: reward.reward_type,
      points_required: reward.points_required,
      product_id: reward.product_id || '',
      discount_value: reward.discount_value || 0,
      discount_type: reward.discount_type || 'percentage',
      max_uses: reward.max_uses || 0,
      starts_at: toLocalDateInput(reward.starts_at),
      ends_at: toLocalDateInput(reward.ends_at),
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        reward_type: form.reward_type,
        points_required: form.points_required,
        product_id: form.reward_type === 'free_product' ? form.product_id || null : null,
        discount_value: (form.reward_type === 'percentage_discount' || form.reward_type === 'fixed_discount') ? form.discount_value || null : null,
        discount_type: form.reward_type === 'percentage_discount' ? 'percentage' : form.reward_type === 'fixed_discount' ? 'fixed' : null,
        max_uses: form.max_uses > 0 ? form.max_uses : null,
        starts_at: toDateInput(form.starts_at, 'start'),
        ends_at: toDateInput(form.ends_at, 'end'),
      }

      if (editId) {
        await updateReward({ id: editId, body }).unwrap()
      } else {
        await createReward(body).unwrap()
      }

      setShowForm(false)
      resetForm()
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save reward'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteReward(id).unwrap()
      setConfirmDelete(null)
      refetch()
    } catch {
      // ignore
    }
  }

  const handleToggle = async (reward: LoyaltyReward) => {
    try {
      await toggleReward({ id: reward.id, is_active: !reward.is_active }).unwrap()
      refetch()
    } catch {
      // ignore
    }
  }

  const activeRewards = rewards.filter((r) => getRewardStatus(r) === 'active')
  const scheduledRewards = rewards.filter((r) => getRewardStatus(r) === 'scheduled')
  const expiredRewards = rewards.filter((r) => getRewardStatus(r) === 'expired')
  const inactiveRewards = rewards.filter((r) => getRewardStatus(r) === 'inactive')

  const inputClass = "w-full rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Rewards</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Create rewards that customers can redeem with their loyalty points.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            New Reward
          </Button>
        )}
      </div>

      {/* Reward Types Quick Reference */}
      <div className="rounded-xl border border-outline-variant/50 bg-surface-container/30 p-4">
        <h3 className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-3">
          Reward Types
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {Object.entries(REWARD_TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-2 text-on-surface-variant">
              <Gift className="h-3.5 w-3.5 text-primary shrink-0" />
              <span><strong className="text-on-surface">{label}</strong> — {REWARD_TYPE_DESCRIPTIONS[type as RewardType]}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high mb-4">
            <Gift className="h-8 w-8 text-on-surface-variant/30" />
          </div>
          <p className="text-sm font-headline font-bold text-on-surface">No rewards yet</p>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
            Create your first reward so customers can redeem their loyalty points.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <SectionHeading title={`Active (${activeRewards.length})`} />
          <div className="space-y-4">
            {activeRewards.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                status="active"
                isAdmin={isAdmin}
                onEdit={() => handleEdit(r)}
                onDelete={() => setConfirmDelete(r.id)}
                onToggle={() => handleToggle(r)}
              />
            ))}
          </div>

          {scheduledRewards.length > 0 && (
            <>
              <SectionHeading title={`Scheduled (${scheduledRewards.length})`} className="pt-6" />
              <div className="space-y-4">
                {scheduledRewards.map((r) => (
                  <RewardCard
                    key={r.id}
                    reward={r}
                    status="scheduled"
                    isAdmin={isAdmin}
                    onEdit={() => handleEdit(r)}
                    onDelete={() => setConfirmDelete(r.id)}
                    onToggle={() => handleToggle(r)}
                  />
                ))}
              </div>
            </>
          )}

          {expiredRewards.length > 0 && (
            <CollapsibleGroup
              title="Expired"
              count={expiredRewards.length}
              open={expiredOpen}
              onToggle={() => setExpiredOpen((v) => !v)}
            >
              {expiredRewards.map((r) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  status="expired"
                  isAdmin={isAdmin}
                  onEdit={() => handleEdit(r)}
                  onDelete={() => setConfirmDelete(r.id)}
                  onToggle={() => handleToggle(r)}
                />
              ))}
            </CollapsibleGroup>
          )}

          {inactiveRewards.length > 0 && (
            <CollapsibleGroup
              title="Inactive"
              count={inactiveRewards.length}
              open={inactiveOpen}
              onToggle={() => setInactiveOpen((v) => !v)}
            >
              {inactiveRewards.map((r) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  status="inactive"
                  isAdmin={isAdmin}
                  onEdit={() => handleEdit(r)}
                  onDelete={() => setConfirmDelete(r.id)}
                  onToggle={() => handleToggle(r)}
                />
              ))}
            </CollapsibleGroup>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm() } }}>
        <ModalContent className="sm:max-w-lg">
          <ModalHeader>
            <ModalTitle>{editId ? 'Edit Reward' : 'Create Reward'}</ModalTitle>
            <ModalDescription>
              {editId ? 'Update the reward details below.' : 'Define a new reward for customers to redeem with points.'}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 px-6 pb-6">
            {error && (
              <div className="rounded-lg bg-error/10 border border-error/30 px-4 py-3 text-xs text-error">{error}</div>
            )}

            <Input
              label="Reward Name"
              placeholder="e.g. Free Coffee"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">Description</label>
              <textarea
                className="w-full rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[80px] resize-y"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-1.5">Reward Type</label>
              <select
                className={inputClass}
                value={form.reward_type}
                onChange={(e) => setForm({ ...form, reward_type: e.target.value as RewardType })}
              >
                {Object.entries(REWARD_TYPE_LABELS).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            </div>

            <Input
              label="Points Required"
              type="number"
              min={1}
              value={String(form.points_required)}
              onChange={(e) => setForm({ ...form, points_required: parseInt(e.target.value) || 0 })}
            />

            {form.reward_type === 'free_product' && (
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1.5">Free Product</label>
                <select
                  className={inputClass}
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                >
                  <option value="">Select a product</option>
                  {products.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {(form.reward_type === 'percentage_discount' || form.reward_type === 'fixed_discount') && (
              <>
                {form.reward_type === 'percentage_discount' ? (
                  <div>
                    <label className="block text-sm font-bold text-on-surface mb-1.5">Discount (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className={inputClass + ' pr-8'}
                        value={String(form.discount_value)}
                        onChange={(e) => setForm({ ...form, discount_value: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant pointer-events-none">%</span>
                    </div>
                  </div>
                ) : (
                  <Input
                    label="Discount Amount"
                    type="number"
                    min={0.01}
                    value={String(form.discount_value)}
                    onChange={(e) => setForm({ ...form, discount_value: parseFloat(e.target.value) || 0 })}
                  />
                )}
              </>
            )}

            <div>
              <Input
                label="Max Uses"
                type="number"
                min={0}
                value={String(form.max_uses)}
                onChange={(e) => setForm({ ...form, max_uses: parseInt(e.target.value) || 0 })}
              />
              <p className="text-[11px] text-on-surface-variant/60 mt-1">Leave 0 for unlimited</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DateField
                label="Start Date"
                value={form.starts_at}
                onChange={(value) => setForm({ ...form, starts_at: value })}
              />
              <DateField
                label="End Date"
                value={form.ends_at}
                onChange={(value) => setForm({ ...form, ends_at: value })}
              />
            </div>
            <p className="text-[11px] text-on-surface-variant/60 -mt-2">
              Pick a date. Leave empty for no limit.
            </p>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => { setShowForm(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={saving} disabled={!form.name || form.points_required < 1}>
              {editId ? 'Save Changes' : 'Create Reward'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <ModalContent className="sm:max-w-sm">
          <ModalHeader>
            <ModalTitle>Delete Reward</ModalTitle>
            <ModalDescription>
              Are you sure you want to delete this reward? This action cannot be undone.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function SectionHeading({ title, className }: { title: string; className?: string }) {
  return (
    <h3 className={cn('font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant px-1 pt-4', className)}>
      {title}
    </h3>
  )
}

function CollapsibleGroup({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-2 px-1 pt-4 pb-2">
        <span className="font-label font-bold text-xs uppercase tracking-wider text-on-surface-variant">
          {title} ({count})
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-on-surface-variant/60 transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      {open && <div className="space-y-4">{children}</div>}
    </div>
  )
}

function RewardCard({
  reward,
  status,
  isAdmin,
  onEdit,
  onDelete,
  onToggle,
}: {
  reward: LoyaltyReward
  status: RewardStatus
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const usesLabel = reward.max_uses
    ? `${reward.current_uses} / ${reward.max_uses}`
    : `${reward.current_uses} uses`

  const chip = STATUS_CHIP[status]

  const durationLabel =
    reward.starts_at && reward.ends_at
      ? `${formatDate(reward.starts_at)} – ${formatDate(reward.ends_at)}`
      : reward.starts_at
        ? `Starts ${formatDate(reward.starts_at)}`
        : reward.ends_at
          ? `Ends ${formatDate(reward.ends_at)}`
          : null

  return (
    <div className={`rounded-xl border p-4 transition-colors ${status === 'expired' ? 'border-error/20 bg-error/[0.04] opacity-80' : 'border-outline-variant/50 bg-surface-container/30 hover:bg-surface-container/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-headline font-bold text-sm text-on-surface truncate">{reward.name}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${chip.className}`}>
              {chip.label}
            </span>
          </div>
          {reward.description && (
            <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{reward.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-on-surface-variant">
            <span>{REWARD_TYPE_LABELS[reward.reward_type]}</span>
            <span className="w-1 h-1 rounded-full bg-on-surface-variant/30" />
            <span className="font-bold text-primary">{reward.points_required} pts</span>
            <span className="w-1 h-1 rounded-full bg-on-surface-variant/30" />
            <span>{usesLabel}</span>
            {reward.reward_type === 'free_product' && reward.product_id && (
              <>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/30" />
                <span>Free product</span>
              </>
            )}
            {reward.reward_type === 'percentage_discount' && reward.discount_value && (
              <>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/30" />
                <span>{reward.discount_value}% off</span>
              </>
            )}
            {reward.reward_type === 'fixed_discount' && reward.discount_value && (
              <>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/30" />
                <span>${reward.discount_value} off</span>
              </>
            )}
          </div>
          {durationLabel && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-on-surface-variant/70">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{durationLabel}</span>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title={reward.is_active ? 'Deactivate' : 'Activate'}
            >
              {reward.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4 text-success" />}
            </button>
            <button
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
