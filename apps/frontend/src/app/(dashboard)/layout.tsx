import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/Sidebar/SidebarContext'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { DashboardContent } from '@/components/layout/DashboardContent'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileDrawer />
        <DashboardContent>
          <DashboardShell />
          <main className="flex-1 p-6">{children}</main>
        </DashboardContent>
      </div>
    </SidebarProvider>
  )
}
