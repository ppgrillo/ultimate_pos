'use client'

import { useState, useRef } from 'react'
import { Upload, FileText } from 'lucide-react'

interface CsvDropZoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function CsvDropZone({ onFileSelected, disabled }: CsvDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel')) {
      onFileSelected(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${dragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-outline-variant/50 bg-surface-container/30 hover:bg-surface-container/50 hover:border-outline-variant'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleChange}
        className="hidden"
      />
      {dragging ? (
        <Upload className="h-10 w-10 text-primary mb-3" />
      ) : (
        <FileText className="h-10 w-10 text-on-surface-variant mb-3" />
      )}
      <p className="text-sm font-bold text-on-surface mb-1">
        {dragging ? 'Drop your file here' : 'Drop a CSV file or click to browse'}
      </p>
      <p className="text-xs text-on-surface-variant">Only .csv files are supported</p>
    </div>
  )
}
