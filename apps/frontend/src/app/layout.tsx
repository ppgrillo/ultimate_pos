import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from '@/store/provider'

export const metadata: Metadata = {
  title: 'Ultimate POS',
  description: 'Point of Sale System',
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
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
