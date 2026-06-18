'use client'

import { useState } from 'react'
import { Download, Upload, Loader2, List } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CsvDropZone } from './CsvDropZone'
import { ImportResults } from './ImportResults'
import { api } from '@/lib/api/client'

const SKU_NOTE = '# SKU is required and used to prevent duplicates. Rows with the same SKU will update the existing product instead of creating a new one.'

const TEMPLATE_HEADERS = [
  'name', 'price', 'cost', 'sku', 'barcode', 'category_name',
  'description', 'stock_qty', 'track_inventory', 'low_stock_threshold',
  'tax_exempt', 'is_active',
]

const TEMPLATE_EXAMPLE = [
  'Caramel Macchiato', '5.99', '2.50', 'BEV-001', '', 'Beverages',
  'Espresso with caramel and steamed milk', '50', 'TRUE', '10', 'FALSE', 'TRUE',
]

interface ImportResponse {
  imported: number
  updated: number
  failed: number
  errors: Array<{ row: number; sku: string; message: string }>
}

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

type Step = 'upload' | 'importing' | 'results'

function generateTemplateCsv(): string {
  const header = TEMPLATE_HEADERS.map((h) => `"${h}"`).join(',')
  const example = TEMPLATE_EXAMPLE.map((v) => `"${v}"`).join(',')
  return `${SKU_NOTE}\n${header}\n${example}\n`
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportModal({ open, onOpenChange, onComplete }: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [results, setResults] = useState<ImportResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('upload')
      setFile(null)
      setResults(null)
      setError(null)
    }, 200)
  }

  const downloadTemplate = () => {
    downloadFile(generateTemplateCsv(), 'product-import-template.csv', 'text/csv')
  }

  const downloadCurrentList = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get<{ data: any[] }>('/products'),
        api.get<{ data: any[] }>('/categories'),
      ])

      const catMap = new Map<string, string>()
      categoriesRes.data.forEach((c: any) => catMap.set(c.id, c.name))

      const header = TEMPLATE_HEADERS.map((h) => `"${h}"`).join(',')
      const rows = productsRes.data.map((p: any) =>
        TEMPLATE_HEADERS.map((h) => {
          let val: any
          switch (h) {
            case 'category_name':
              val = p.category_id ? catMap.get(p.category_id) ?? '' : ''
              break
            case 'track_inventory':
            case 'tax_exempt':
            case 'is_active':
              val = p[h] ? 'TRUE' : 'FALSE'
              break
            default:
              val = p[h] ?? ''
          }
          return `"${String(val).replace(/"/g, '""')}"`
        }).join(','),
      )

      const csv = header + '\n' + rows.join('\n') + '\n'
      downloadFile(csv, 'product-export.csv', 'text/csv')
    } catch {
      // silently fail
    }
  }

  const handleFileSelected = (f: File) => {
    setFile(f)
    setError(null)
  }

  const handleImport = async () => {
    if (!file) return
    setStep('importing')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.upload<ImportResponse>('/products/import', formData)
      setResults(res)
      setStep('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStep('upload')
    }
  }

  const handleDone = () => {
    onComplete()
    handleClose()
  }

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <ModalContent className="max-w-xl">
        <ModalHeader>
          <ModalTitle>Import Products</ModalTitle>
          <ModalDescription>
            Bulk upload products from a CSV file. Each product needs a unique SKU — rows with matching SKUs will be updated instead of duplicated.
          </ModalDescription>
        </ModalHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-400 space-y-1">
              <p className="font-bold">⚠️ SKU is required for every product.</p>
              <p>
                The <strong>SKU</strong> column is used to match existing products. If a SKU already exists,
                the product <strong>updates</strong> instead of duplicating. Rows without a SKU will be rejected.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download template
              </button>
              <span className="text-on-surface-variant/40">|</span>
              <button
                onClick={downloadCurrentList}
                className="flex items-center gap-2 text-sm text-secondary hover:underline"
              >
                <List className="h-4 w-4" />
                Download current list
              </button>
            </div>

            <CsvDropZone
              onFileSelected={handleFileSelected}
            />

            {file && (
              <div className="flex items-center justify-between rounded-xl bg-surface-container/50 border border-outline-variant p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-on-surface font-medium">{file.name}</span>
                  <span className="text-on-surface-variant">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button size="sm" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </Button>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-error-container/20 border border-error/30 p-3 text-sm text-error">
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-bold text-on-surface">Importing products...</p>
            <p className="text-xs text-on-surface-variant mt-1">This may take a moment</p>
          </div>
        )}

        {step === 'results' && results && (
          <ImportResults results={results} onClose={handleDone} />
        )}
      </ModalContent>
    </Modal>
  )
}
