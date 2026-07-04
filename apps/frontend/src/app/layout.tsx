import type { Metadata, Viewport } from 'next'
import { Outfit, Lexend } from 'next/font/google'
import './globals.css'
import { Providers } from '@/store/provider'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Ultimate POS',
    template: '%s | Ultimate POS',
  },
  description:
    'Modern point of sale system for restaurants and retail. Manage orders, products, customers, and payments in real time.',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${outfit.variable} ${lexend.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:inset-x-0 focus:top-0 focus:z-[100] focus:flex focus:h-12 focus:items-center focus:justify-center focus:bg-primary focus:text-primary-on focus:text-sm focus:font-label focus:font-bold"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
