import { cn } from '@/lib/utils'

interface ResultTileProps {
  label: string
  value: string
  icon?: React.ElementType
  tone?: 'positive' | 'negative' | 'neutral'
  hint?: string
}

export function ResultTile({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  hint,
}: ResultTileProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container/50 border border-outline-variant/30 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-label font-bold text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
      </div>
      <p
        className={cn(
          'font-headline text-xl font-bold',
          tone === 'positive' && 'text-primary',
          tone === 'negative' && 'text-error',
          tone === 'neutral' && 'text-on-surface',
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-on-surface-variant/60 mt-1">{hint}</p>}
    </div>
  )
}

export type { ResultTileProps }