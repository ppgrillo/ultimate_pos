'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value?: string | null
  onChange: (value: string | null) => void
  className?: string
}

export function ImageUpload({ value, onChange, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(value ?? null)
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return
      if (file.size > 5 * 1024 * 1024) return

      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await api.upload<{ data: { url: string } }>('/products/upload-image', formData)
        setPreview(res.data.url)
        onChange(res.data.url)
      } catch {
        // error silently handled
      } finally {
        setUploading(false)
      }
    },
    [onChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleClick = () => inputRef.current?.click()

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (value) api.delete('/products/upload-image', { url: value }).catch(() => {})
    setPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      onClick={uploading ? undefined : handleClick}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-surface-container/50 p-8 transition-colors hover:border-primary/60 min-h-[200px] group',
        preview && 'border-solid border-primary/60',
        uploading && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-on-surface-variant">Uploading image...</p>
        </div>
      ) : preview ? (
        <>
          <img
            src={preview}
            alt="Product preview"
            className="max-h-[200px] rounded-lg object-contain"
          />
          <button
            onClick={handleRemove}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface hover:bg-error hover:text-error-on transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="mt-2 text-xs text-on-surface-variant">Click to change image</p>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 group-hover:scale-110 transition-transform duration-300">
            <ImagePlus className="h-8 w-8 text-primary" />
          </div>
          <p className="font-headline text-base font-bold text-on-surface">
            Upload Product Image
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">JPG, PNG (Max 5MB)</p>
        </>
      )}
    </div>
  )
}
