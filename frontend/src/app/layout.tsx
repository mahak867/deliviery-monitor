import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/ui/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TrackAll — Universal Delivery Tracker for India',
    template: '%s | TrackAll',
  },
  description:
    'Track all your deliveries from Delhivery, BlueDart, DTDC, Ekart, India Post and more — all in one place.',
  keywords: ['delivery tracker', 'shipment tracking', 'India', 'courier tracking', 'package tracking'],
  authors: [{ name: 'TrackAll' }],
  creator: 'TrackAll',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    title: 'TrackAll — Universal Delivery Tracker for India',
    description: 'Track all your deliveries in one place',
    siteName: 'TrackAll',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-dark-950 text-white antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#4ade80', secondary: '#1e293b' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#1e293b' },
            },
          }}
        />
      </body>
    </html>
  )
}
