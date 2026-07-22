'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { X, LayoutDashboard, ShoppingCart, ClipboardList, Package, Users, Settings, LogOut, Tag, BarChart3 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { closeDrawer } from '@/store/slices/uiSlice'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/promotions', label: 'Promotions', icon: Tag },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileDrawer() {
  const dispatch = useAppDispatch()
  const pathname = usePathname()
  const { data: session } = useSession()
  const isOpen = useAppSelector((s) => s.ui.drawerOpen)

  const handleClose = () => dispatch(closeDrawer())
  const user = session?.user as { name?: string; email?: string; role?: string } | undefined

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={handleClose}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform border-r border-outline-variant bg-surface-container-low transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <span className="text-lg font-headline font-extrabold text-primary-on">P</span>
              </div>
              <span className="font-headline text-headline-md text-on-surface">
                Ultimate POS
              </span>
            </div>
            <button
              onClick={handleClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-outline-variant px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-sm font-label font-bold text-on-surface">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label font-bold text-on-surface">
                  {user?.name ?? 'Admin'}
                </p>
                <p className="truncate text-xs text-on-surface-variant">
                  {user?.role === 'admin' ? 'Store Owner' : 'Staff'}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-label font-bold transition-colors',
                    isActive
                      ? 'bg-primary text-primary-on'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-outline-variant px-3 py-4">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-label font-bold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
