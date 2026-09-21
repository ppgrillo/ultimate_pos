'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { openWhatsAppChat } from '@/lib/wallet'
import type { Supplier, SupplierInput } from '@ultimate-pos/shared'
import { useCreateSupplierMutation, useUpdateSupplierMutation } from '@/store/api'
import { cn } from '@/lib/utils'

interface SupplierFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
}

interface FormState {
  name: string
  contact_name: string
  phone: string
  email: string
  website: string
  address: string
  notes: string
  is_active: boolean
}

function emptyForm(): FormState {
  return {
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    notes: '',
    is_active: true,
  }
}

function toForm(supplier: Supplier): FormState {
  return {
    name: supplier.name,
    contact_name: supplier.contact_name ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    website: supplier.website ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
    is_active: supplier.is_active,
  }
}

function toNull(value: string): string | null {
  return value.trim() === '' ? null : value.trim()
}

export function SupplierForm({ open, onOpenChange, supplier }: SupplierFormProps) {
  const [createSupplier] = useCreateSupplierMutation()
  const [updateSupplier] = useUpdateSupplierMutation()

  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editing = Boolean(supplier)

  const canWhatsApp = form.phone.replace(/\D/g, '').length >= 8
  const whatsAppMessage = `Hola ${(form.contact_name || form.name || 'proveedor').trim()}, quiero hacerte un pedido desde mi punto de venta.`

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const reset = () => {
    setForm(supplier ? toForm(supplier) : emptyForm())
    setSaving(false)
    setError(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  useEffect(() => {
    if (open) {
      setForm(supplier ? toForm(supplier) : emptyForm())
      setSaving(false)
      setError(null)
    }
  }, [open, supplier])

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Supplier name is required')
      return
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('Enter a valid email address')
      return
    }
    if (form.website && !/^https?:\/\/\S+$/.test(form.website.trim())) {
      setError('Website must start with http:// or https://')
      return
    }

    const body: SupplierInput = {
      name: form.name.trim(),
      contact_name: toNull(form.contact_name),
      phone: toNull(form.phone),
      email: toNull(form.email),
      website: toNull(form.website),
      address: toNull(form.address),
      notes: toNull(form.notes),
      is_active: form.is_active,
    }

    setSaving(true)
    setError(null)
    try {
      if (editing && supplier) {
        await updateSupplier({ id: supplier.id, body }).unwrap()
      } else {
        await createSupplier(body).unwrap()
      }
      handleOpenChange(false)
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'data' in (err as any)
          ? ((err as any).data?.error ?? err.message)
          : err instanceof Error
            ? err.message
            : 'Failed to save supplier'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'bg-surface-container'

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-lg">
        <ModalHeader>
          <ModalTitle>{editing ? 'Edit Supplier' : 'New Supplier'}</ModalTitle>
          <ModalDescription>
            Save a permanent record of your vendor so purchases stay linked to them.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 px-6 pb-6">
          {error && (
            <div className="rounded-lg bg-error/10 border border-error/30 px-4 py-3 text-xs text-error">{error}</div>
          )}

          <Input
            label="Supplier name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Distribuidora Norte"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact person"
              value={form.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              placeholder="e.g. Ana Torres"
              className={inputClass}
            />
            <div className="space-y-2">
              <PhoneInput
                label="Phone"
                value={form.phone}
                onChange={(phone) => set('phone', phone)}
                placeholder="555 123 4567"
                defaultCountry="MX"
              />
              <button
                type="button"
                disabled={!canWhatsApp}
                onClick={() => openWhatsAppChat(form.phone, whatsAppMessage)}
                title={canWhatsApp ? 'Open WhatsApp chat' : 'Add a valid phone to send WhatsApp'}
                className={cn(
                  'flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                  canWhatsApp
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-surface-container-high text-on-surface-variant/60',
                )}
              >
                <MessageCircle className="h-4 w-4" />
                Send WhatsApp
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="ventas@proveedor.mx"
              className={inputClass}
            />
            <Input
              label="Website"
              type="url"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="supplier-address" className="block text-sm font-bold text-on-surface mb-1.5">Address</label>
            <input
              id="supplier-address"
              className="w-full h-10 rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Street, city, state"
            />
          </div>

          <div>
            <label htmlFor="supplier-notes" className="block text-sm font-bold text-on-surface mb-1.5">What they supply</label>
            <textarea
              id="supplier-notes"
              className="w-full rounded-lg border border-outline-variant/50 bg-surface-container/50 px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[64px] resize-y"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="e.g. Textiles, uniforms, cleaning products"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl bg-surface-container/30 border border-outline-variant/50 p-4 cursor-pointer hover:bg-surface-container/60 transition-colors">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className={cn('h-5 w-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary')}
            />
            <div>
              <span className="block text-sm font-bold text-on-surface">Active supplier</span>
              <span className="block text-xs text-on-surface-variant mt-0.5">Inactive suppliers are hidden from expense forms.</span>
            </div>
          </label>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            {editing ? 'Save Changes' : 'Add Supplier'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}