import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'YUMI — Delivery para tu ciudad',
    template: '%s | YUMI',
  },
  description:
    'Pide comida de tus restaurantes favoritos. Delivery rápido en tu ciudad.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://yumi.pe'),
  openGraph: {
    title: 'YUMI — Delivery para tu ciudad',
    description: 'Pide comida de tus restaurantes favoritos.',
    siteName: 'YUMI',
    locale: 'es_PE',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
