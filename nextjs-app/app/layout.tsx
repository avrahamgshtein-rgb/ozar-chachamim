import type { Metadata, Viewport } from 'next'
import { Frank_Ruhl_Libre, Heebo } from 'next/font/google'
import './globals.css'

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-frank-ruhl',
  display: 'swap',
})

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'אוצר חכמים — גרף הידע של חכמי ישראל',
    template: '%s | אוצר חכמים',
  },
  description:
    'בסיס ידע אינטראקטיבי על חכמי ישראל לדורותיהם — ויזואליזציה דינמית של קשרים, גיאוגרפיה ומסורות.',
  keywords: ['חכמי ישראל', 'תורה', 'רבנים', 'ויזואליזציה', 'Jewish sages', 'Torah', 'knowledge graph'],
  openGraph: {
    title: 'אוצר חכמים',
    description: 'גרף הידע של חכמי ישראל',
    type: 'website',
    locale: 'he_IL',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0806',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

// Root layout — locale-specific <html> attributes are set in [locale]/layout.tsx
// suppressHydrationWarning prevents React warnings when locale layout updates lang/dir
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning className={`${frankRuhlLibre.variable} ${heebo.variable}`}>
      <head suppressHydrationWarning>
        {/* ערכת נושא לפני ציור ראשון — מונע הבהוב ותקף גם בדפי חכם */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html:
          "try{if(localStorage.getItem('ozar-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}" }} />
      </head>
      <body className="font-sans bg-ink-900 text-ink-100 antialiased">
        {children}
      </body>
    </html>
  )
}
