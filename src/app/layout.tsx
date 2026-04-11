import type { Metadata } from 'next'
import '../styles/globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "Kenility's Planning Poker",
  description: 'Real-time planning poker for agile teams — by Kenility',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen font-sans">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(224 25% 10%)',
              border: '1px solid hsl(224 25% 18%)',
              color: 'hsl(213 31% 91%)',
            },
          }}
        />
      </body>
    </html>
  )
}
