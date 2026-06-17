'use client'

import { Bell, Menu } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { openDrawer } from '@/store/slices/uiSlice'

export function Header() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const storeName = useAppSelector((s) => s.storeConfig.currentStore?.name)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-container-low/80 px-4 backdrop-blur-glass lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(openDrawer())}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="w-48 sm:w-72">
          <Input
            placeholder="Search products, orders..."
            className="h-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-outline-variant">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest text-sm font-label font-bold text-on-surface">
            {(user?.name ?? 'A').charAt(0).toUpperCase()}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-label font-bold text-on-surface">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-on-surface-variant">
              {user?.role === 'admin'
                ? (storeName ?? 'Mi Tienda')
                : 'Staff'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
