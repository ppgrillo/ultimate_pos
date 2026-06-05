'use client'

import { Search, QrCode } from 'lucide-react'

interface PosSearchBarProps {
  value: string
  onChange: (value: string) => void
  onScanClick?: () => void
}

export function PosSearchBar({ value, onChange, onScanClick }: PosSearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search products..."
          className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container pl-9 pr-3 text-sm text-on-body placeholder:text-on-surface-variant/50 backdrop-blur-glass transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      {onScanClick && (
        <button
          onClick={onScanClick}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          title="Scan barcode or QR"
        >
          <QrCode className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
