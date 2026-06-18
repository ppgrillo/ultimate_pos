'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/components/layout/Sidebar/SidebarContext'

interface DashboardContentProps {
  children: ReactNode
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col transition-all duration-300',
        collapsed ? 'lg:ml-16' : 'lg:ml-64',
      )}
    >
      {children}
    </div>
  )
}
