'use client'

import { cn } from '@/lib/utils'

interface PromotionBadgeProps {
  text: string
  className?: string
}

export function PromotionBadge({ text, className }: PromotionBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-label font-bold uppercase tracking-wider text-secondary-on shadow-sm',
        className,
      )}
    >
      {text}
    </span>
  )
}
