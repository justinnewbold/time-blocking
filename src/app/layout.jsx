import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { BackgroundProvider } from '@/components/BackgroundContext'

export const metadata = {
  title: 'Frog 🐸 - Eat Your Frogs First',
  description: 'Compassionate productivity app that works with your brain, not against it. Tackle your hardest tasks first with energy-based filtering and gamification.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Frog'
  },
  formatDetection: {
    telephone: false
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#22c55e' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ]
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Frog" />
        <meta name="msapplication-TileColor" content="#22c55e" />
        
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon.svg" />
        
        {/* Preload fonts for iOS feel */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="text-white antialiased overscroll-none selection:bg-green-500/30">
        <BackgroundProvider>
          <ServiceWorkerRegister />
          {children}
          <InstallPrompt />
        </BackgroundProvider>
      </body>
    </html>
  )
}
