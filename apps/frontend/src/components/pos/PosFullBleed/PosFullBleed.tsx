import type { ReactNode } from 'react'

/**
 * Full-bleed wrapper for POS routes. It cancels the dashboard `<main>` padding
 * (`p-6 pb-24 lg:pb-6`) and pins itself to the viewport height so the POS
 * chrome (sticky header + fixed bottom nav) can fill the screen without the
 * extra padding/scroll the dashboard shell would otherwise introduce.
 *
 * Every `/pos*` route layout must wrap its children in this component so the
 * experience stays identical across `/pos` and `/pos-kitchen`.
 */
export function PosFullBleed({ children }: { children: ReactNode }) {
  return (
    <div className="-m-6 h-[calc(100dvh-4rem)] overflow-hidden lg:h-[calc(100vh-4rem)]">
      {children}
    </div>
  )
}
