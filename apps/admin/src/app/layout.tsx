import type { Metadata, Viewport } from 'next';
import { clientEnv } from '@jbaybff/config/client';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_ADMIN_URL),
  title: {
    default: 'JBay BFF · Admin',
    template: '%s · JBay BFF Admin',
  },
  description: 'Internal admin dashboard for the Jeffreys Bay Blue Flag Foundation.',
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: '#0F4C75',
  width: 'device-width',
  initialScale: 1,
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className="bg-cream">
      <body className="font-sans">{children}</body>
    </html>
  );
}
