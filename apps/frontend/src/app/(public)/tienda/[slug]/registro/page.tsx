'use client'

import { useParams } from 'next/navigation'
import { CustomerRegistrationForm } from '@/components/customers/CustomerRegistrationForm'

export default function PublicRegisterPage() {
  const params = useParams()
  const slug = params.slug as string

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-on-surface-variant">Enlace inválido</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerRegistrationForm storeSlug={slug} />
    </div>
  )
}
