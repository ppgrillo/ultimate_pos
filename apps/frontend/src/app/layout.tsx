import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/store/provider'

export const metadata: Metadata = {
  title: 'Ultimate POS',
  description: 'Point of Sale System',
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
