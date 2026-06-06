import { Sidebar } from '@/components/layout/Sidebar'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileDrawer />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <DashboardShell />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
