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
  ContactRound,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useSidebar } from './SidebarContext'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: ContactRound },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-outline-variant bg-surface-container-low p-3 transition-all duration-300 lg:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center mb-8', collapsed ? 'justify-center' : 'justify-between px-1')}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shrink-0">
            <span className="text-sm font-headline font-extrabold text-primary-on">P</span>
          </div>
          {!collapsed && (
            <span className="font-headline text-sm font-bold text-on-surface truncate">Ultimate POS</span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={toggle}
            title="Collapse sidebar"
            className="flex h-6 w-6 items-center justify-center rounded-md text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container transition-all duration-200"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Collapse trigger (visible when collapsed) */}
      {collapsed && (
        <button
          onClick={toggle}
          title="Expand sidebar"
          className="flex items-center justify-center w-full mb-6 text-on-surface-variant/40 hover:text-primary transition-colors duration-200"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-lg transition-colors',
                collapsed
                  ? 'justify-center py-2.5 px-0'
                  : 'gap-3 px-3 py-2.5 text-sm font-label font-bold',
                isActive
                  ? 'bg-primary text-primary-on'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', collapsed && '')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className={cn(
          'flex items-center rounded-lg transition-colors text-on-surface-variant hover:bg-surface-container hover:text-error',
          collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5 text-sm font-label font-bold',
        )}
        title={collapsed ? 'Sign Out' : undefined}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        {!collapsed && <span>Sign Out</span>}
      </button>
    </aside>
  )
}
