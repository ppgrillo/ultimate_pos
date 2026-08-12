'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ImagePlus, X, Upload, CheckCircle, AlertCircle, Loader2, Link, Search, Trash2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'

interface FileEntry {
  id: string
  file: File
  sku: string
  preview: string
  status: 'pending' | 'compressing' | 'ready' | 'uploading' | 'done' | 'error'
  error?: string
  url?: string
}

interface UploadResult {
  file: string
  sku: string
  status: 'matched' | 'unmatched'
  url?: string
}

interface SimpleProduct {
  id: string
  name: string
  sku: string | null
  image_url: string | null
}

interface BulkImageUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export function BulkImageUpload({ open, onOpenChange, onComplete }: BulkImageUploadProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[] | null>(null)
  const [products, setProducts] = useState<SimpleProduct[]>([])
  const [linkingSku, setLinkingSku] = useState<string | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [linking, setLinking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      api.get<{ data: SimpleProduct[] }>('/products').then((res) => setProducts(res.data)).catch(() => {})
    } else {
      setProducts([])
      setLinkingSku(null)
      setProductSearch('')
    }
  }, [open])

  const extractSku = (name: string): string => {
    const dot = name.lastIndexOf('.')
    return dot > 0 ? name.slice(0, dot) : name
  }

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(incoming)
      .filter((f) => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024)
      .map((f) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        return {
          id,
          file: f,
          sku: extractSku(f.name),
          preview: URL.createObjectURL(f),
          status: 'pending' as const,
        }
      })

    setFiles((prev) => [...prev, ...entries])
    setResults(null)

    for (const entry of entries) {
      setFiles((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: 'ready' as const } : e)),
      )
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const clearAll = () => {
    setFiles([])
    setResults(null)
  }

  const uploadOne = async (entry: FileEntry): Promise<UploadResult[]> => {
    const formData = new FormData()
    formData.append('files', entry.file, entry.file.name)

    const res = await api.upload<{ data: UploadResult[] }>('/products/upload-images', formData)
    return res.data
  }

  const handleUpload = async () => {
    const ready = files.filter((f) => f.status === 'ready')
    if (ready.length === 0) return

    setUploading(true)
    setResults(null)
    const allResults: UploadResult[] = []

    for (const entry of ready) {
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' as const } : f)),
      )

      try {
        const entryResults = await uploadOne(entry)
        allResults.push(...entryResults)

        const result = entryResults[0]
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: result?.status === 'matched' ? ('done' as const) : ('error' as const),
                  error: result?.status === 'unmatched' ? 'No product with this SKU' : undefined,
                  url: result?.url,
                }
              : f,
          ),
        )
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error' as const, error: 'Upload failed' }
              : f,
          ),
        )
      }
    }

    setResults(allResults)
    setUploading(false)
  }

  const handleLink = async (sku: string, productId: string, url: string) => {
    setLinking(true)
    try {
      await api.patch(`/products/${productId}/image`, { image_url: url })
      setFiles((prev) =>
        prev.map((f) =>
          f.sku === sku ? { ...f, status: 'done' as const, error: undefined } : f,
        ),
      )
      setResults((prev) =>
        prev
          ? prev.map((r) => (r.sku === sku ? { ...r, status: 'matched' as const } : r))
          : null,
      )
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, image_url: url } : p,
        ),
      )
      setLinkingSku(null)
      setProductSearch('')
    } catch {
      // keep as unmatched
    } finally {
      setLinking(false)
    }
  }

  const handleDeleteImage = async (sku: string, url: string) => {
    try {
      await api.delete('/products/upload-image', { url })
    } catch {
      // ignore delete errors
    }
    setFiles((prev) => prev.filter((f) => f.sku !== sku))
    setResults((prev) => (prev ? prev.filter((r) => r.sku !== sku) : null))
    if (linkingSku === sku) {
      setLinkingSku(null)
      setProductSearch('')
    }
  }

  const handleClose = () => {
    if (!uploading) {
      clearAll()
      onOpenChange(false)
    }
  }

  const matched = results ? results.filter((r) => r.status === 'matched').length : 0
  const unmatched = results ? results.filter((r) => r.status === 'unmatched').length : 0

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase()
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q))
    )
  })

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <ModalHeader>
          <ModalTitle>Upload Images</ModalTitle>
          <ModalDescription>
            Name each file by SKU (e.g., <span className="font-mono text-primary">BEV-001.jpg</span>).
            Drop files here or click to select. Images are compressed to ~1200px JPEG.
          </ModalDescription>
        </ModalHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-surface-container/50 p-6 transition-colors hover:border-primary/60"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <ImagePlus className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm font-bold text-on-surface">Drop images or click to browse</p>
            <p className="text-xs text-on-surface-variant mt-0.5">JPG, PNG — Max 5MB each</p>
          </div>

          {/* Results summary */}
          {results && (
            <div className="flex items-center gap-4 rounded-xl bg-surface-container-high p-4">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-on-surface font-bold">{matched} matched</span>
              </div>
              {unmatched > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <AlertCircle className="h-4 w-4 text-error" />
                  <span className="text-error font-bold">{unmatched} unmatched</span>
                </div>
              )}
              <div className="text-xs text-on-surface-variant ml-auto">{results.length} total</div>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
                {!uploading && (
                  <button onClick={clearAll} className="text-xs text-error hover:underline">
                    Clear all
                  </button>
                )}
              </div>
              {files.map((entry) => {
                const isUnmatched = entry.status === 'error' && entry.error === 'No product with this SKU'
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg bg-surface-container/50 border border-outline-variant/50 p-3"
                  >
                    <img
                      src={entry.preview}
                      alt=""
                      className="h-10 w-10 rounded-md object-cover bg-surface-container-high"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{entry.file.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        SKU: <span className="font-mono text-primary">{entry.sku}</span>
                        {' · '}
                        {(entry.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {entry.status === 'compressing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {entry.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
                      {entry.status === 'done' && <CheckCircle className="h-4 w-4 text-primary" />}
                      {isUnmatched ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => entry.url && handleDeleteImage(entry.sku, entry.url)}
                            className="text-on-surface-variant hover:text-error transition-colors p-1"
                            title="Delete from storage"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {linkingSku === entry.sku ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl bg-surface-container-high border border-outline-variant shadow-xl p-3 z-10">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
                                  <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Search products..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    className="w-full rounded-lg border border-outline-variant bg-surface-container pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
                                    autoFocus
                                  />
                                </div>
                                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                  {filteredProducts.length === 0 ? (
                                    <p className="text-xs text-on-surface-variant py-2 text-center">No products found</p>
                                  ) : (
                                    filteredProducts.slice(0, 20).map((p) => (
                                      <button
                                        key={p.id}
                                        onClick={() => entry.url && handleLink(entry.sku, p.id, entry.url)}
                                        disabled={linking}
                                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left hover:bg-primary/10 transition-colors disabled:opacity-50"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <span className="block text-on-surface font-bold truncate">{p.name}</span>
                                          <span className="block text-on-surface-variant truncate">
  {p.sku || 'no SKU'}
  {p.image_url && <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">IMG</span>}
</span>
                                        </div>
                                        {linking && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                              <Button size="sm" variant="outline" disabled className="text-xs">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Linking...
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setLinkingSku(entry.sku)
                                setProductSearch('')
                                setTimeout(() => searchRef.current?.focus(), 50)
                              }}
                              className="text-xs"
                            >
                              <Link className="h-3 w-3 mr-1" />
                              Link
                            </Button>
                          )}
                        </div>
                      ) : entry.status === 'error' ? (
                        <span className="text-xs text-error" title={entry.error}>{entry.error === 'Upload failed' ? 'Failed' : 'Error'}</span>
                      ) : null}
                      {entry.status === 'pending' && <span className="text-xs text-on-surface-variant">Pending</span>}
                      {entry.status === 'ready' && !uploading && (
                        <button
                          onClick={() => removeFile(entry.id)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <ModalFooter>
          {results && (
            <Button variant="ghost" onClick={() => {
              const orphans = files.filter((f) => f.status === 'error' && f.error === 'No product with this SKU' && f.url)
              for (const o of orphans) {
                api.delete('/products/upload-image', { url: o.url }).catch(() => {})
              }
              onComplete()
              handleClose()
            }}>
              Done
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={uploading || files.filter((f) => f.status === 'ready').length === 0}
            isLoading={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : `Upload ${files.filter((f) => f.status === 'ready').length} file${files.filter((f) => f.status === 'ready').length !== 1 ? 's' : ''}`}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
