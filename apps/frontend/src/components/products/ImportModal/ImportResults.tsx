'use client'

import { Download, XCircle, CheckCircle, RefreshCw, Tag } from 'lucide-react'

interface ImportResultsData {
  imported: number
  updated: number
  failed: number
  errors: Array<{ row: number; sku: string; message: string }>
  categories_created?: string[]
}

interface ImportResultsProps {
  results: ImportResultsData
  onClose: () => void
}

export function ImportResults({ results, onClose }: ImportResultsProps) {
  const hasErrors = results.failed > 0 && results.errors.length > 0

  const downloadErrors = () => {
    const headers = 'row,sku,error\n'
    const rows = results.errors.map((e) => `${e.row},"${e.sku}","${e.message}"`).join('\n')
    const csv = headers + rows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-errors.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
          <CheckCircle className="h-6 w-6 text-primary mx-auto mb-1" />
          <p className="text-2xl font-headline font-bold text-primary">{results.imported}</p>
          <p className="text-xs text-on-surface-variant">Imported</p>
        </div>
        <div className="rounded-xl bg-tertiary/10 border border-tertiary/20 p-4 text-center">
          <RefreshCw className="h-6 w-6 text-tertiary mx-auto mb-1" />
          <p className="text-2xl font-headline font-bold text-tertiary">{results.updated}</p>
          <p className="text-xs text-on-surface-variant">Updated</p>
        </div>
        <div className="rounded-xl bg-error-container/20 border border-error/30 p-4 text-center">
          <XCircle className="h-6 w-6 text-error mx-auto mb-1" />
          <p className="text-2xl font-headline font-bold text-error">{results.failed}</p>
          <p className="text-xs text-on-surface-variant">Failed</p>
        </div>
      </div>

      {results.categories_created && results.categories_created.length > 0 && (
        <div className="rounded-xl bg-secondary/10 border border-secondary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-4 w-4 text-secondary" />
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Categories created ({results.categories_created.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {results.categories_created.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasErrors && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Errors ({results.errors.length})
            </p>
            <button
              onClick={downloadErrors}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Download className="h-3 w-3" />
              Download CSV
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {results.errors.map((err, idx) => (
              <div
                key={idx}
                className="rounded-lg bg-error-container/10 border border-error/20 px-3 py-2 text-xs"
              >
                <span className="font-bold text-error">Row {err.row}</span>
                {err.sku && <span className="text-on-surface-variant ml-1">({err.sku})</span>}
                <span className="text-on-surface ml-2">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full rounded-lg bg-primary text-primary-on py-2.5 text-sm font-bold font-label hover:bg-primary/90 transition-colors"
      >
        Done
      </button>
    </div>
  )
}
