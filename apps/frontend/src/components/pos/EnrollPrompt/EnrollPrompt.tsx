'use client'

import { Stars } from 'lucide-react'
import { useState } from 'react'
import { useEnrollCustomerMutation } from '../../../store/api'

interface EnrollPromptProps {
  customerId: string
  customerName: string
  pointsLabel?: string
  onEnrolled?: (card: { id: string; points: number; tier: string }) => void
}

export function EnrollPrompt({ customerId, customerName, pointsLabel = 'Points', onEnrolled }: EnrollPromptProps) {
  const [enroll, { isLoading }] = useEnrollCustomerMutation()
  const [error, setError] = useState<string | null>(null)

  const handleEnroll = async () => {
    setError(null)
    try {
      const result = await enroll({ customer_id: customerId }).unwrap()
      onEnrolled?.({
        id: result.card.id,
        points: result.card.points,
        tier: result.card.tier,
      })
    } catch {
      setError('Failed to enroll. Try again.')
    }
  }

  return (
    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Stars className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold text-on-surface">{pointsLabel} Program</span>
      </div>
      <p className="text-xs text-on-surface-variant mb-3">
        Enroll <strong className="text-on-surface">{customerName}</strong> to start earning {pointsLabel.toLowerCase()} on every purchase.
      </p>
      {error && <p className="text-xs text-error mb-2">{error}</p>}
      <button
        onClick={handleEnroll}
        disabled={isLoading}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {isLoading ? 'Enrolling...' : `Enroll in ${pointsLabel}`}
      </button>
    </div>
  )
}
