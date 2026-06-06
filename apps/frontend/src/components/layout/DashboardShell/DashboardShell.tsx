'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/layout/Header'

export function DashboardShell() {
  const pathname = usePathname()
  if (pathname.startsWith('/pos')) return null
  return <Header />
}
