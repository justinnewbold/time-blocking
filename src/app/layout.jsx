import './globals.css'
import InstallPrompt from '@/components/InstallPrompt'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { BackgroundProvider } from '@/components/BackgroundContext'
import { AchievementsProvider } from '@/components/AchievementsContext'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata = {
  title: 'Frog 🐸',
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
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ]
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark-mode">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Frog" />
        <meta name="msapplication-TileColor" content="#22c55e" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
        
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/icons/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96.png" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152.png" />
        
        {/* Splash screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="text-white antialiased overscroll-none selection:bg-green-500/30">
        <ThemeProvider>
          <BackgroundProvider>
            <AchievementsProvider>
              <ServiceWorkerRegister />
              {children}
              <InstallPrompt />
            </AchievementsProvider>
          </BackgroundProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
