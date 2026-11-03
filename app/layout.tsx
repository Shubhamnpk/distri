import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { WebsiteStructuredData } from '@/components/website-structured-data'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Drishti — Nepal Public Data & Accountability',
    template: '%s | Drishti',
  },
  description: 'Explore Nepal public data in one place: government company finances, infrastructure progress, NEPSE, procurement, weather, disasters and official source records.',
  applicationName: 'Drishti',
  category: 'public data',
  verification: {
    google: 'EFpFXOWm0uDbsHZn9Zx68YEIj2kVVUUNQ_idK3tzPr0',
  },
  openGraph: {
    type: 'website',
    locale: 'en_NP',
    siteName: 'Drishti',
    title: {
      default: 'Drishti — Nepal Public Data & Accountability',
      template: '%s | Drishti',
    },
    description: 'Explore Nepal public data, government company finances, infrastructure progress, markets and live environment feeds.',
    images: ['/images/nepal-infrastructure.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: 'Drishti — Nepal Public Data & Accountability',
      template: '%s | Drishti',
    },
    description: 'Explore Nepal public data, government company finances, infrastructure progress, markets and live environment feeds.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f14' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <WebsiteStructuredData />
        <ThemeProvider>
          <div className="app-shell">
            <Header />
            {children}
            <Footer />
          </div>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
