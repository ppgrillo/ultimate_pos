'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { QuickCustomerForm } from './QuickCustomerForm'
import type { CustomerWithLoyalty } from '@/store/slices/customersSlice'

interface QuickCustomerRegisterProps {
  onCreated?: (customer: CustomerWithLoyalty) => void
  className?: string
}

export function QuickCustomerRegister({ onCreated, className }: QuickCustomerRegisterProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <CollapsibleSection
      title="New customer"
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      icon={<UserPlus className="h-3.5 w-3.5" />}
      className={className}
    >
      <QuickCustomerForm
        onCreated={(customer) => {
          setExpanded(false)
          onCreated?.(customer)
        }}
      />
    </CollapsibleSection>
  )
}
