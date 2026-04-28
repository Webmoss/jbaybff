import type { Metadata, Viewport } from 'next';
import { clientEnv } from '@jbaybff/config/client';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_WEB_URL),
  title: {
    default: 'Jeffreys Bay Blue Flag Foundation',
    template: '%s · JBay BFF',
  },
  description:
    'Helping Jeffreys Bay earn and keep Blue Flag status — one wave, one cleanup, one Saturday at a time.',
  openGraph: {
    type: 'website',
    siteName: 'Jeffreys Bay Blue Flag Foundation',
    locale: 'en_ZA',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0F4C75',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className="bg-cream">
      <body className="font-sans">{children}</body>
    </html>
  );
}
