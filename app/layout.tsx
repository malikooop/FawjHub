import './globals.css';
import type { Metadata, Viewport } from 'next';
import inter from '@/lib/fonts';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'FawjHub — Academic Resource Platform',
  description: 'A clean, private study hub for university students. Find lectures, TDs, TPs, exams, and corrections organized by subject.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FawjHub',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1117' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <div className="relative min-h-screen">
              <Header />
              <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 md:pb-8">
                {children}
              </main>
              <BottomNav />
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
