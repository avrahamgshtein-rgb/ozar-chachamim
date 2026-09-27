import type { Metadata, Viewport } from 'next'
import { SITE_URL } from '@/lib/siteUrl'
import './globals.css'

// Fallback metadata for documents outside a locale (the root 404). Locale
// pages get theirs from app/[locale]/layout.tsx. A plain string, not a
// template: a template here would also wrap the locale layout's default
// title, giving "Ozar Chachamim — … | אוצר חכמים" on every home page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'אוצר חכמים — גרף הידע של חכמי ישראל',
}

export const viewport: Viewport = {
  themeColor: '#0a0806',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

// A pass-through: <html> and <body> are rendered by app/[locale]/layout.tsx,
// which knows the locale and so can set lang/dir on the server. Documents that
// live outside a locale (app/not-found.tsx, app/global-error.tsx) render their
// own <html>. A root layout is still required because those files exist here.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
