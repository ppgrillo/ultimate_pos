import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/Sidebar/SidebarContext'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { DashboardContent } from '@/components/layout/DashboardContent'
import { DashboardMobileNav } from '@/components/layout/DashboardMobileNav'
import { BillingGate } from '@/components/billing/BillingGate'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <MobileDrawer />
        <DashboardContent>
          <DashboardShell />
          <main id="main-content" className="flex-1 p-6 pb-24 lg:pb-6 overflow-y-auto">
            <Suspense fallback={null}>
              <BillingGate>{children}</BillingGate>
            </Suspense>
            <footer className="mt-auto pt-8 pb-2 text-center">
              <p className="text-[11px] text-on-surface-variant/40">
                &copy; {new Date().getFullYear()} Ultimate POS
              </p>
            </footer>
          </main>
        </DashboardContent>
      </div>
      <DashboardMobileNav />
      <div className="grain" />
    </SidebarProvider>
  )
}
