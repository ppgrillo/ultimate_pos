'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface-container-low p-4">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <span className="text-lg font-headline font-extrabold text-primary-on">P</span>
        </div>
        <span className="font-headline text-headline-md text-on-surface">
          Ultimate POS
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-label font-bold transition-colors',
                isActive
                  ? 'bg-primary text-primary-on'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-label font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
      >
        <LogOut className="h-5 w-5" />
        Sign Out
      </button>
    </aside>
  )
}
