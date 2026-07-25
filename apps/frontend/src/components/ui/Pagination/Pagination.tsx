import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-outline-variant/40 bg-surface-container/50 px-2 py-1 text-xs font-label font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        )}
        <span className="text-xs text-on-surface-variant/70">
          {from}–{to} of {totalItems}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-label font-bold transition-all duration-150',
            'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            'disabled:opacity-30 disabled:pointer-events-none',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-on-surface-variant/50">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-label font-bold transition-all duration-150',
                p === page
                  ? 'bg-primary text-primary-on shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              {(p as number) + 1}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-label font-bold transition-all duration-150',
            'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
            'disabled:opacity-30 disabled:pointer-events-none',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  const pages: (number | '...')[] = [0]
  if (current > 2) pages.push('...')

  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 3) pages.push('...')
  pages.push(total - 1)

  return pages
}
