'use client'

import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from '@/components/ui/Modal'

export interface CreatedCategory {
  id: string
  name: string
  description: string | null
}

interface CreateCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (category: CreatedCategory) => void
}

export function CreateCategoryModal({
  open,
  onOpenChange,
  onCreated,
}: CreateCategoryModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setDescription('')
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await api.post<{ data: CreatedCategory }>('/categories', {
        name: name.trim(),
        description: description.trim() || null,
      })
      onCreated(res.data)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <FolderPlus className="h-4 w-4 text-primary" />
            </div>
            <ModalTitle>New Category</ModalTitle>
          </div>
          <ModalDescription>
            Create a category to organize your products in the menu.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hot Drinks, Snacks, Combos"
            required
            autoFocus
          />

          <div className="space-y-1">
            <label className="block text-sm font-label font-bold text-on-surface-variant">
              Description
              <span className="ml-1 text-xs font-normal text-on-surface-variant/50">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category..."
              rows={3}
              className="flex w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-body placeholder:text-on-surface-variant/50 backdrop-blur-glass transition-colors resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-error rounded-lg bg-error-container/20 border border-error/30 px-3 py-2">
              {error}
            </p>
          )}

          <ModalFooter>
            <ModalClose asChild>
              <Button type="button" variant="ghost" disabled={saving}>
                Cancel
              </Button>
            </ModalClose>
            <Button type="submit" disabled={!name.trim() || saving} isLoading={saving}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
