'use client'

import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
  badge?: string | number
  icon?: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
  badge,
  icon,
  className,
}: CollapsibleSectionProps) {
  return (
    <div className={cn('border-b border-outline-variant/50', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-surface-container/50 transition-colors"
      >
        {icon && <span className="text-on-surface-variant shrink-0">{icon}</span>}
        <span className="flex-1 text-left text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
          {title}
        </span>
        {badge !== undefined && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-label font-bold text-primary">
            {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-on-surface-variant transition-transform duration-300 shrink-0',
            expanded ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
