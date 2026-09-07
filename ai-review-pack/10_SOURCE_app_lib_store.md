# Source Bundle 1 / 2 — Routes, Server Logic, State

Every file under `app/`, `lib/` and `store/` of the Next.js application, verbatim.
Paths are relative to the `nextjs-app/` directory. The `@/` import alias maps to that same root.

## Contents

- `app/[locale]/about/page.tsx`
- `app/[locale]/auth/login/page.tsx`
- `app/[locale]/auth/signup/page.tsx`
- `app/[locale]/error.tsx`
- `app/[locale]/icon.tsx`
- `app/[locale]/layout.tsx`
- `app/[locale]/page.tsx`
- `app/[locale]/sage/[id]/loading.tsx`
- `app/[locale]/sage/[id]/page.tsx`
- `app/api/chat/route.ts`
- `app/api/research/[id]/route.ts`
- `app/auth/callback/route.ts`
- `app/global-error.tsx`
- `app/globals.css`
- `app/icon.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `app/sitemap.ts`
- `lib/analytics.ts`
- `lib/contentOverlay.ts`
- `lib/hooks/useD3ForceWorker.ts`
- `lib/i18n.ts`
- `lib/locationCoords.ts`
- `lib/milestones.ts`
- `lib/optimizedForceSimulation.ts`
- `lib/personal.ts`
- `lib/rag/anonymousSession.ts`
- `lib/rag/buildContext.ts`
- `lib/rag/claude.ts`
- `lib/rag/entityExtraction.ts`
- `lib/rag/sefaria.ts`
- `lib/rag/systemPrompt.ts`
- `lib/rag/wikipedia.ts`
- `lib/regions.ts`
- `lib/search.ts`
- `lib/serverData.ts`
- `lib/structuredData.ts`
- `lib/supabase-auth/client.ts`
- `lib/supabase-auth/server.ts`
- `lib/supabase-auth/serviceRole.ts`
- `lib/supabase.ts`
- `lib/types.ts`
- `lib/utils.ts`
- `lib/workers/d3-force-worker.ts`
- `store/useAppStore.ts`

---

## FILE: app/[locale]/about/page.tsx

_(202 lines)_

```tsx
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

const translations = {
  he: {
    title: '🏛️ אוצר חכמים',
    subtitle: 'בסיס ידע מובנה על חכמי ישראל לדורותיהם',
    description: 'עם ויזואליזציה דינמית של קשרים בין חכמים המיועדת לתלמידי ישיבות ובוגריהן.',
    network: 'הרשת שלנו',
    sages: 'חכמים',
    connections: 'קשרים',
    research: 'חכמים עם מחקר',
    coverage: 'כיסוי גיאוגרפי',
    features: '✨ תכונות ראשיות',
    feature1: 'רשת קשרים אינטראקטיבית — D3.js force-directed network',
    feature2: 'מפה גיאוגרפית — עקוב אחר מיקומים והגירות של חכמים',
    feature3: 'חיפוש מתקדם — תמיכה בתרגומים בעברית ותצורות שונות',
    feature4: 'מסמכי מחקר — 423 מסמכי מחקר סקורים ומיוחסים',
    feature5: 'חומרי הוראה — תכניות שיעור של 45 דקות ושאלות דיון',
    feature6: 'ממשק דו-לשוני — עברית (RTL) ואנגלית מלאות',
    feature7: 'responsive לכל מכשיר — שולחני, טאבלט, סלולרי',
    projectLead: '👤 מנהל הפרויקט',
    techStack: '💻 Tech Stack',
    dataSources: '📚 מקורות הנתונים',
    spirit: '🎓 רוח הפרויקט',
    spirit_text: 'אנחנו מאמינים שחכמי ישראל לא צריכים להיות שמות בספר, אלא דמויות חיות המחוברות בדוגמה, בוויכוח ובהשפעה הדדית. פרויקט זה שומר על החוכמה שלהם בזמן שהוא עושה אותה נגישה לדור הבא של חוקרים ותלמידים.',
    footer: 'אוצר חכמים — Preserving the Wisdom of Our Sages',
    updated: 'עודכן: אוגוסט 2026 | Version 2.0',
  },
  en: {
    title: '🏛️ Ozar Chachamim',
    subtitle: 'The Knowledge Graph of Jewish Sages',
    description: 'An interactive knowledge base serving yeshiva students and graduates.',
    network: 'Our Network',
    sages: 'Sages',
    connections: 'Connections',
    research: 'Sages with Research',
    coverage: 'Geographic Coverage',
    features: '✨ Key Features',
    feature1: 'Interactive Connection Network — D3.js force-directed network',
    feature2: 'Geographic Map — Track sage locations and migration paths',
    feature3: 'Advanced Search — Support for Hebrew transliterations',
    feature4: 'Research Documents — 423 scholarly summaries',
    feature5: 'Teaching Materials — 45-minute lesson plans and discussions',
    feature6: 'Bilingual Interface — Full Hebrew (RTL) and English support',
    feature7: 'Responsive Design — Works on desktop, tablet, mobile',
    projectLead: '👤 Project Lead',
    techStack: '💻 Tech Stack',
    dataSources: '📚 Data Sources',
    spirit: '🎓 Project Spirit',
    spirit_text: 'We believe Jewish sages should not be names in a book, but living figures connected through example, debate, and mutual influence. This project preserves their wisdom while making it accessible to the next generation of researchers and students.',
    footer: 'Ozar Chachamim — Preserving the Wisdom of Our Sages',
    updated: 'Updated: August 2026 | Version 2.0',
  },
  ru: {
    title: '🏛️ Оцар Хахамим',
    subtitle: 'Граф знаний еврейских мудрецов',
    description: 'Интерактивная база знаний для студентов и выпускников ешив.',
    network: 'Наша сеть',
    sages: 'Мудрецы',
    connections: 'Связи',
    research: 'Мудрецы с исследованиями',
    coverage: 'Географическое покрытие',
    features: '✨ Основные возможности',
    feature1: 'Интерактивная сеть соединений — D3.js force-directed network',
    feature2: 'Географическая карта — отслеживание местоположения и путей миграции',
    feature3: 'Расширенный поиск — поддержка еврейской транслитерации',
    feature4: 'Исследовательские документы — 423 научных резюме',
    feature5: 'Учебные материалы — планы уроков на 45 минут и обсуждения',
    feature6: 'Двуязычный интерфейс — полная поддержка иврита (RTL) и английского',
    feature7: 'Адаптивный дизайн — работает на настольных компьютерах, планшетах, мобильных',
    projectLead: '👤 Руководитель проекта',
    techStack: '💻 Технологический стек',
    dataSources: '📚 Источники данных',
    spirit: '🎓 Дух проекта',
    spirit_text: 'Мы верим, что еврейские мудрецы должны быть не просто имена в книге, а живые фигуры, связанные примером, дебатами и взаимным влиянием. Этот проект сохраняет их мудрость, делая её доступной для следующего поколения исследователей и студентов.',
    footer: 'Оцар Хахамим — сохраняя мудрость наших мудрецов',
    updated: 'Обновлено: август 2026 | Версия 2.0',
  },
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale
  const t = translations[validLocale]
  const isHe = validLocale === 'he'

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 py-16 px-6 ${isHe ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold font-serif text-gold-400 mb-4">{t.title}</h1>
          <p className="text-xl text-slate-300 mb-2">{t.subtitle}</p>
          <p className="text-slate-400">{t.description}</p>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 text-center">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">422</div>
            <div className="text-sm text-slate-400">{t.sages}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">1,624</div>
            <div className="text-sm text-slate-400">{t.connections}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">309</div>
            <div className="text-sm text-slate-400">{t.research}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">9</div>
            <div className="text-sm text-slate-400">{t.coverage}</div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gold-400 mb-8">{t.features}</h2>
          <ul className="space-y-3">
            {[
              t.feature1,
              t.feature2,
              t.feature3,
              t.feature4,
              t.feature5,
              t.feature6,
              t.feature7,
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-300">
                <span className="text-gold-400 mt-1">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Project Lead */}
        <div className="bg-slate-800/30 rounded-lg p-8 mb-16 border border-gold-500/10">
          <h3 className="text-xl font-bold text-gold-400 mb-4">{t.projectLead}</h3>
          <p className="text-lg font-semibold text-slate-200">Avraham Goldshtein</p>
          <a
            href="mailto:avraham.gshtein@gmail.com"
            className="text-gold-400 hover:text-gold-300 transition-colors"
          >
            avraham.gshtein@gmail.com
          </a>
        </div>

        {/* Tech Stack */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div>
            <h3 className="text-lg font-bold text-gold-400 mb-3">{t.techStack}</h3>
            <p className="text-slate-400 text-sm">
              Frontend: Next.js, TypeScript, Tailwind CSS
              <br />
              Visualization: D3.js v7, Leaflet.js
              <br />
              Data: Supabase, JSON
              <br />
              Deployment: Vercel
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gold-400 mb-3">{t.dataSources}</h3>
            <p className="text-slate-400 text-sm">
              Master dataset: Hebrew sages database
              <br />
              Research: 423 biographical documents across 309 sages
              <br />
              Geographic data: GeoNames, OpenStreetMap
              <br />
              Timeline: Talmudic sources & encyclopedias
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gold-400 mb-3">{t.spirit}</h3>
            <p className="text-slate-400 text-sm">{t.spirit_text}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gold-500/20 pt-8">
          <p className="text-lg font-semibold text-gold-400 mb-2">{t.footer}</p>
          <p className="text-sm text-slate-500">{t.updated}</p>
        </div>
      </div>
    </div>
  )
}
```

## FILE: app/[locale]/auth/login/page.tsx

_(33 lines)_

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isValidLocale, UI } from '@/lib/i18n'
import { LoginForm } from '@/components/auth/LoginForm'
import type { Locale } from '@/lib/types'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const validLocale = locale as Locale
  const t = UI[validLocale]
  const dir = validLocale === 'he' ? 'rtl' : 'ltr'

  return (
    <div
      className="h-dvh flex flex-col items-center justify-center gap-8 bg-ink-900 text-ink-100 font-sans px-4"
      dir={dir}
    >
      <Link href={`/${validLocale}`} className="text-lg font-serif text-gold-300">
        {t.appTitle}
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-ink-700/40 bg-ink-800/30 p-6">
        <LoginForm locale={validLocale} />
      </div>
    </div>
  )
}
```

## FILE: app/[locale]/auth/signup/page.tsx

_(33 lines)_

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isValidLocale, UI } from '@/lib/i18n'
import { SignupForm } from '@/components/auth/SignupForm'
import type { Locale } from '@/lib/types'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function SignupPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  const validLocale = locale as Locale
  const t = UI[validLocale]
  const dir = validLocale === 'he' ? 'rtl' : 'ltr'

  return (
    <div
      className="h-dvh flex flex-col items-center justify-center gap-8 bg-ink-900 text-ink-100 font-sans px-4"
      dir={dir}
    >
      <Link href={`/${validLocale}`} className="text-lg font-serif text-gold-300">
        {t.appTitle}
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-ink-700/40 bg-ink-800/30 p-6">
        <SignupForm locale={validLocale} />
      </div>
    </div>
  )
}
```

## FILE: app/[locale]/error.tsx

_(118 lines)_

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import { tr } from '@/lib/i18n'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  params?: { locale: string }
}

export default function Error({ error, reset, params }: ErrorProps) {
  const locale = (params?.locale ?? 'he') as Locale
  const isHe = locale === 'he'

  useEffect(() => {
    // Log to error tracking service (e.g., Sentry)
    console.error('[Error Boundary]', error.message, error.stack)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, {
        contexts: {
          page: { locale, timestamp: new Date().toISOString() }
        }
      })
    }
  }, [error, locale])

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center',
      'bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900',
      'px-4 py-8'
    )}>
      <div className={cn(
        'max-w-md w-full glass rounded-2xl',
        'border border-ink-700/50 p-8',
        'text-center'
      )}>
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className={cn(
            'w-16 h-16 rounded-full',
            'bg-red-500/10 border border-red-500/30',
            'flex items-center justify-center'
          )}>
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10a9 9 0 00-9 9m18 0a9 9 0 01-18 0m0 0a9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-ink-100 mb-2">
          {isHe ? 'משהו השתבש' : 'Something went wrong'}
        </h1>

        {/* Error Description */}
        <p className="text-sm text-ink-400 mb-6 leading-relaxed">
          {isHe
            ? 'התרחשה שגיאה בעת טעינת הדף. אנא נסה שוב או חזור לעמוד הבית.'
            : 'An error occurred while loading this page. Please try again or return to the home page.'}
        </p>

        {/* Error Details (Dev Only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-xs text-ink-500 hover:text-ink-400 transition-colors">
              {isHe ? 'פרטי שגיאה (dev only)' : 'Error details (dev only)'}
            </summary>
            <pre className="mt-2 p-3 bg-ink-900/50 rounded text-xs text-red-400 overflow-auto max-h-32 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className={cn(
          'flex flex-col gap-3',
          isHe ? 'flex-row-reverse' : ''
        )}>
          <button
            onClick={() => reset()}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium',
              'bg-blue-600 hover:bg-blue-700',
              'text-white transition-colors',
              'text-sm'
            )}
          >
            {isHe ? 'נסה שוב' : 'Try again'}
          </button>
          <Link
            href={`/${locale}`}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium',
              'bg-ink-700 hover:bg-ink-600',
              'text-ink-100 transition-colors',
              'text-sm text-center'
            )}
          >
            {isHe ? 'חזור לעמוד הבית' : 'Go home'}
          </Link>
        </div>

        {/* Support Info */}
        <p className="mt-6 text-xs text-ink-500">
          {isHe
            ? 'אם בעיה זו חוזרת, אנא צור קשר עם התמיכה'
            : 'If this issue persists, please contact support'}
        </p>
      </div>
    </div>
  )
}
```

## FILE: app/[locale]/icon.tsx

_(30 lines)_

```tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0a0806',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontSize: 18,
          color: '#c9973a',
          fontWeight: 700,
        }}
      >
        א
      </div>
    ),
    { ...size },
  )
}
```

## FILE: app/[locale]/layout.tsx

_(46 lines)_

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { LocaleProvider } from '@/components/providers/LocaleProvider'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return [{ locale: 'he' }, { locale: 'en' }, { locale: 'ru' }]
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = UI[locale as Locale]
  return {
    title: {
      default: `${t.appTitle} — ${t.appSubtitle}`,
      template: `%s | ${t.appTitle}`,
    },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale

  return (
    // LocaleProvider sets html[lang] and html[dir] on the client
    <LocaleProvider locale={validLocale}>
      {children}
    </LocaleProvider>
  )
}
```

## FILE: app/[locale]/page.tsx

_(31 lines)_

```tsx
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import { fetchSageStats } from '@/lib/supabase'
import type { Locale } from '@/lib/types'
import { AppShell } from '@/components/layout/AppShell'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function MainPage({ params }: PageProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale

  // Fetch initial stats server-side (fast first paint)
  const stats = await fetchSageStats().catch(() => ({ total: 0, lastUpdate: '' }))

  return (
    <AppShell
      locale={validLocale}
      initialTotal={stats.total}
      initialLastUpdate={stats.lastUpdate}
    />
  )
}
```

## FILE: app/[locale]/sage/[id]/loading.tsx

_(36 lines)_

```tsx
export default function SageLoading() {
  return (
    <div className="min-h-dvh bg-ink-900 text-ink-100 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        {/* Back nav skeleton */}
        <div className="h-8 w-24 bg-ink-800 rounded-lg mb-8" />

        {/* Hero */}
        <div className="mb-8 space-y-3">
          <div className="h-5 w-20 bg-ink-800 rounded-full" />
          <div className="h-10 w-3/4 bg-ink-800 rounded-lg" />
          <div className="h-4 w-1/2 bg-ink-800 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-4 w-24 bg-ink-800 rounded" />
            <div className="h-4 w-32 bg-ink-800 rounded" />
          </div>
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-ink-800 rounded" style={{ width: `${70 + i * 5}%` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-ink-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

## FILE: app/[locale]/sage/[id]/page.tsx

_(349 lines)_

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSageById, getSageConnections } from '@/lib/serverData'
import { ResearchSection } from '@/components/sages/ResearchSection'
import { isValidLocale, UI } from '@/lib/i18n'
import { ERA_LABELS, ERA_COLORS, CONNECTION_LABELS } from '@/lib/types'
import { formatYearRange } from '@/lib/utils'
import { EraChip } from '@/components/ui/EraChip'
import type { Locale, Sage } from '@/lib/types'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const sage = getSageById(id)
  if (!sage) return {}

  const t = UI[(locale as Locale) ?? 'he']
  const title = sage.name_en
    ? `${sage.label} — ${sage.name_en}`
    : sage.label
  const description = sage.bio?.slice(0, 160) ?? `${sage.label} — ${t.appTitle}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    alternates: {
      canonical: `/${locale}/sage/${id}`,
      languages: {
        he: `/he/sage/${id}`,
        en: `/en/sage/${id}`,
      },
    },
  }
}

function buildJsonLd(sage: Sage, locale: Locale) {
  const era = ERA_LABELS[sage.period]?.[locale] ?? sage.period
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: sage.name_en ?? sage.label,
    alternateName: sage.label,
    description: sage.bio ?? undefined,
    birthDate: sage.birth_year ? String(sage.birth_year) : undefined,
    deathDate: sage.death_year ? String(sage.death_year) : undefined,
    birthPlace: sage.location
      ? { '@type': 'Place', name: sage.location }
      : undefined,
    knowsAbout: sage.field ?? era,
    sameAs: [
      `https://he.wikipedia.org/wiki/${encodeURIComponent(sage.label)}`,
      sage.name_en
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sage.name_en)}`
        : null,
    ].filter(Boolean),
  }
}

export default async function SagePage({ params }: PageProps) {
  const { locale, id } = await params

  if (!isValidLocale(locale)) notFound()

  const validLocale = locale as Locale
  const t = UI[validLocale]

  const sage        = getSageById(id)
  const connections = getSageConnections(id)

  if (!sage) notFound()

  const dir        = validLocale === 'he' ? 'rtl' : 'ltr'
  const accentColor = ERA_COLORS[sage.period] ?? '#c9973a'
  const yearRange  = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(sage, validLocale)) }}
      />

      <div
        className="h-dvh overflow-y-auto bg-ink-900 text-ink-100 font-sans"
        dir={dir}
        lang={validLocale === 'he' ? 'he' : 'en'}
      >
        {/* Top nav bar */}
        <nav className="sticky top-0 z-10 glass border-b border-gold-500/10 px-4 md:px-8 h-14 flex items-center justify-between gap-4">
          <Link
            href={`/${validLocale}`}
            className="flex items-center gap-2 text-sm font-sans text-ink-400 hover:text-gold-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={validLocale === 'he' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
            {t.appTitle}
          </Link>

          <Link
            href={`/${validLocale === 'he' ? 'en' : 'he'}/sage/${id}`}
            className="text-xs font-sans text-ink-500 hover:text-ink-300 transition-colors px-3 py-1.5 rounded-lg glass-light border border-ink-700/40"
          >
            {validLocale === 'he' ? 'EN' : 'עב'}
          </Link>
        </nav>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
          {/* ── Hero ──────────────────────────────────────────── */}
          <header
            className="rounded-2xl p-6 md:p-8 mb-8"
            style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, transparent 60%)`,
                     border: `1px solid ${accentColor}25` }}
          >
            <EraChip period={sage.period} locale={validLocale} className="mb-4" />

            <h1 className="font-serif text-3xl md:text-4xl font-bold text-ink-50 leading-tight">
              {sage.label}
            </h1>

            {sage.name_en && (
              <p className="font-sans text-lg text-ink-400 mt-2">{sage.name_en}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm font-sans text-ink-400">
              {yearRange && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {yearRange}
                </span>
              )}
              {sage.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {sage.location}
                </span>
              )}
              {sage.field && (
                <span className="text-ink-500">
                  {sage.field}
                </span>
              )}
            </div>

            {/* Tags */}
            {sage.tags && sage.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {sage.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-800/60 text-ink-300 border border-ink-700/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* ── Body grid ─────────────────────────────────────── */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left: main content */}
            <div className="md:col-span-2 space-y-8">

              {/* Core concept */}
              {sage.core_concept && (
                <Section title={t.coreConcept}>
                  <blockquote
                    className="border-s-2 ps-5 py-1 italic font-serif text-base text-ink-100 leading-relaxed"
                    style={{ borderColor: accentColor }}
                  >
                    {sage.core_concept}
                  </blockquote>
                </Section>
              )}

              {/* Biography */}
              {sage.bio && (
                <Section title={t.biography}>
                  <p className="font-sans text-sm text-ink-200 leading-loose whitespace-pre-line">
                    {sage.bio}
                  </p>
                </Section>
              )}

              {/* Full research documents — client-side fetch (Vercel-safe) */}
              <ResearchSection sageId={sage.id} locale={validLocale} />

              {/* Migration path */}
              {sage.migration_path && (
                <Section title={t.migrationPath}>
                  <MigrationPath path={sage.migration_path} accentColor={accentColor} />
                </Section>
              )}

              {/* External links */}
              <Section title={t.externalLinks}>
                <div className="flex flex-wrap gap-2">
                  <ExtLink
                    href={`https://www.sefaria.org/search#${encodeURIComponent(sage.name_en ?? sage.label)}`}
                    label="Sefaria" icon="📜"
                  />
                  <ExtLink
                    href={`https://he.wikipedia.org/wiki/${encodeURIComponent(sage.label)}`}
                    label="ויקיפדיה" icon="📖"
                  />
                  {sage.name_en && (
                    <ExtLink
                      href={`https://en.wikipedia.org/wiki/${encodeURIComponent(sage.name_en)}`}
                      label="Wikipedia" icon="🌐"
                    />
                  )}
                  <ExtLink
                    href={`https://www.nli.org.il/find/books?query=${encodeURIComponent(sage.label)}`}
                    label="הספרייה הלאומית" icon="🏛"
                  />
                </div>
              </Section>
            </div>

            {/* Right: connections sidebar */}
            <aside className="space-y-6">
              {connections.length > 0 && (
                <Section title={`${t.relatedSages} (${connections.length})`}>
                  <ul className="space-y-2">
                    {connections.map((conn, idx) => {
                      const other      = conn.otherSage
                      const connLabel  = CONNECTION_LABELS[conn.type]?.[validLocale] ?? conn.type
                      const otherColor = ERA_COLORS[other.period] ?? '#7a6550'
                      return (
                        <li key={idx}>
                          <Link
                            href={`/${validLocale}/sage/${other.id}`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ink-800/40 hover:bg-ink-700/50 border border-ink-700/40 hover:border-ink-600/60 transition-all group"
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: otherColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate">
                                {other.label}
                              </p>
                              {other.name_en && (
                                <p className="text-xs font-sans text-ink-500 truncate">{other.name_en}</p>
                              )}
                            </div>
                            <span
                              className="text-[10px] font-sans px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: `${accentColor}18`, color: accentColor }}
                            >
                              {connLabel}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              )}

              {/* Data source badge */}
              <div className="rounded-xl border border-ink-700/40 p-4 bg-ink-800/30">
                <p className="text-[10px] font-sans uppercase tracking-widest text-ink-600 mb-2">
                  {validLocale === 'he' ? 'מקור נתונים' : 'Data Source'}
                </p>
                <p className="text-xs font-sans text-ink-400">
                  {validLocale === 'he'
                    ? 'אוצר חכמים — בסיס הנתונים של חכמי ישראל'
                    : 'Ozar Chachamim — Jewish Sages Knowledge Base'}
                </p>
                <p className="text-xs font-sans text-ink-600 mt-1">
                  ID: {sage.id}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function MigrationPath({ path, accentColor }: {
  path: NonNullable<Sage['migration_path']>
  accentColor: string
}) {
  const stops = [path.from, ...(path.intermediate ?? []), path.to]
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {stops.map((stop, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-sans"
            style={i === 0 || i === stops.length - 1
              ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
              : { background: 'rgba(42,35,24,0.6)', color: '#9a8570', border: '1px solid rgba(58,50,38,0.5)' }}
          >
            {stop}
          </span>
          {i < stops.length - 1 && (
            <svg className="w-3 h-3 text-ink-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
      ))}
    </div>
  )
}

function ExtLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-sans bg-ink-800/50 hover:bg-ink-700/60 text-ink-300 hover:text-ink-100 border border-ink-700/40 hover:border-ink-600/50 transition-all"
    >
      <span>{icon}</span> {label}
    </a>
  )
}
```

## FILE: app/api/chat/route.ts

_(261 lines)_

```ts
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase-auth/server'
import { createServiceRoleClient } from '@/lib/supabase-auth/serviceRole'
import {
  ANON_SESSION_COOKIE, generateSessionToken, hashSessionToken, getOrCreateAnonymousSession,
} from '@/lib/rag/anonymousSession'
import { buildRagContext } from '@/lib/rag/buildContext'
import { buildSystemPrompt } from '@/lib/rag/systemPrompt'
import { callClaude, estimateCost, ClaudeApiError, type ChatMessage } from '@/lib/rag/claude'
import type { Locale } from '@/lib/types'

export const runtime = 'nodejs'

const MAX_HISTORY_MESSAGES = 10
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days — matches anonymous_sessions.retention_expires_at

interface ChatRequestBody {
  message: string
  sessionId?: string
  locale?: Locale
}

// Read-only quota check — lets the chat widget show "X questions left"
// before the visitor sends anything, without creating an anonymous_sessions
// row or touching a reservation.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: periods } = await supabase
      .from('usage_periods')
      .select('question_limit, questions_used, questions_reserved, period_end')
      .eq('user_id', user.id)
    const active = (periods ?? []).filter(p => !p.period_end || new Date(p.period_end) > new Date())
    const limit = active.reduce((sum, p) => sum + p.question_limit, 0)
    const used = active.reduce((sum, p) => sum + p.questions_used + p.questions_reserved, 0)
    return NextResponse.json({ authenticated: true, quota: { limit, remaining: Math.max(limit - used, 0) } })
  }

  const existingToken = request.cookies.get(ANON_SESSION_COOKIE)?.value
  if (existingToken) {
    const serviceClient = createServiceRoleClient()
    const { data: session } = await serviceClient
      .from('anonymous_sessions')
      .select('questions_limit, questions_used, questions_reserved, linked_user_id')
      .eq('session_token_hash', hashSessionToken(existingToken))
      .maybeSingle()
    if (session && !session.linked_user_id) {
      const remaining = Math.max(session.questions_limit - session.questions_used - session.questions_reserved, 0)
      return NextResponse.json({ authenticated: false, quota: { limit: session.questions_limit, remaining } })
    }
  }

  // No cookie yet, or it's already linked to a registered account — either
  // way report the default trial allowance (mirrors anonymous_sessions.
  // questions_limit's DEFAULT 3 in the M1 migration; keep these in sync).
  return NextResponse.json({ authenticated: false, quota: { limit: 3, remaining: 3 } })
}

export async function POST(request: NextRequest) {
  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  const locale: Locale = body.locale ?? 'he'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    return user
      ? await handleAuthenticated(supabase, user.id, message, body.sessionId, locale)
      : await handleAnonymous(request, message, locale)
  } catch (err) {
    // Catches failures before either flow's own reservation/release try-catch
    // takes over (e.g. a missing service-role key, a DB connection error) —
    // without this, such errors bubble up as an empty-body 500 instead of
    // the JSON shape the chat widget expects.
    console.error('[api/chat] unhandled error:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// ── Authenticated flow — persists full chat history ────────────────────────
async function handleAuthenticated(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  message: string,
  bodySessionId: string | undefined,
  locale: Locale,
) {
  const requestId = randomUUID()
  const { data: reservation, error: reserveError } = await supabase
    .rpc('reserve_authenticated_question', { p_request_id: requestId })
    .single()

  if (reserveError || !reservation || !(reservation as any).success) {
    const errorMsg = (reservation as any)?.error_msg ?? reserveError?.message ?? 'reserve_failed'
    const isQuotaExhausted = errorMsg === 'Quota exhausted'
    return NextResponse.json(
      { error: isQuotaExhausted ? 'quota_exhausted' : 'reserve_failed', detail: errorMsg },
      { status: isQuotaExhausted ? 402 : 500 },
    )
  }

  try {
    let sessionId = bodySessionId
    if (sessionId) {
      const { data: existing } = await supabase
        .from('chat_sessions').select('id').eq('id', sessionId).eq('user_id', userId).maybeSingle()
      if (!existing) sessionId = undefined
    }
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions').insert({ user_id: userId }).select('id').single()
      if (sessionError || !newSession) throw new Error(`session_create_failed: ${sessionError?.message}`)
      sessionId = newSession.id
    }

    await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'user', content: message, request_id: requestId,
    })

    const { data: historyRows } = await supabase
      .from('chat_messages').select('role, content').eq('session_id', sessionId)
      .order('created_at', { ascending: false }).limit(MAX_HISTORY_MESSAGES)
    const history: ChatMessage[] = (historyRows ?? []).reverse()
      .map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }))

    const ragContext = await buildRagContext(message, locale)
    const systemPrompt = buildSystemPrompt(ragContext, locale)
    const response = await callClaude(systemPrompt, history)

    await supabase.from('chat_messages').insert({
      session_id: sessionId, role: 'assistant', content: response.text, request_id: requestId,
    })

    await supabase.rpc('confirm_authenticated_question', {
      p_request_id: requestId,
      p_provider: 'anthropic', p_model: response.model,
      p_input_tokens: response.inputTokens, p_output_tokens: response.outputTokens,
      p_estimated_cost: estimateCost(response.inputTokens, response.outputTokens),
    })

    return NextResponse.json({
      sessionId,
      reply: response.text,
      matchedSages: ragContext.matchedSages.map(s => ({ id: s.sage.id, label: s.sage.label })),
      noMatch: ragContext.noMatch,
      quota: null, // authenticated quota isn't surfaced turn-by-turn yet — Stage 4 UI follow-up
    })
  } catch (err) {
    const isClaudeError = err instanceof ClaudeApiError
    await supabase.rpc('release_authenticated_question', {
      p_request_id: requestId,
      p_error_code: isClaudeError ? 'llm_error' : 'internal_error',
      p_error_message: err instanceof Error ? err.message.slice(0, 300) : 'unknown error',
    })
    console.error('[api/chat] authenticated flow failed:', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

// ── Anonymous flow — stateless single-turn (no chat_sessions row, since
// that table requires a real user_id); quota lives in anonymous_sessions,
// gated behind the service-role client because its RLS is USING (false)
// for every operation from the browser. ─────────────────────────────────
async function handleAnonymous(request: NextRequest, message: string, locale: Locale) {
  const existingToken = request.cookies.get(ANON_SESSION_COOKIE)?.value
  const rawToken = existingToken ?? generateSessionToken()
  const isNewCookie = !existingToken

  const quota = await getOrCreateAnonymousSession(rawToken, {
    ip: request.headers.get('x-forwarded-for') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  if (!quota) {
    // Either a genuine DB error, or this token already belongs to a
    // registered account (transfer_anonymous_quota linked it) — either way
    // the visitor should sign in rather than keep using this cookie.
    return NextResponse.json({ error: 'session_invalid' }, { status: 401 })
  }

  const serviceClient = createServiceRoleClient()
  const tokenHash = hashSessionToken(rawToken)
  const requestId = randomUUID()

  const { data: reservation, error: reserveError } = await serviceClient
    .rpc('reserve_anonymous_question', { p_session_token_hash: tokenHash, p_request_id: requestId })
    .single()

  if (reserveError || !reservation || !(reservation as any).success) {
    const errorMsg = (reservation as any)?.error_msg ?? reserveError?.message ?? 'reserve_failed'
    const isQuotaExhausted = errorMsg === 'Quota exhausted'
    const res = NextResponse.json(
      {
        error: isQuotaExhausted ? 'quota_exhausted' : 'reserve_failed',
        detail: errorMsg,
        quota: { limit: quota.questionsLimit, remaining: quota.remaining },
      },
      { status: isQuotaExhausted ? 402 : 500 },
    )
    if (isNewCookie) setAnonCookie(res, rawToken)
    return res
  }

  try {
    // No conversation history for anonymous visitors — each message is its
    // own grounded turn. Full history starts once they register.
    const ragContext = await buildRagContext(message, locale)
    const systemPrompt = buildSystemPrompt(ragContext, locale)
    const response = await callClaude(systemPrompt, [{ role: 'user', content: message }])

    await serviceClient.rpc('confirm_anonymous_question', {
      p_session_token_hash: tokenHash,
      p_request_id: requestId,
      p_provider: 'anthropic', p_model: response.model,
      p_input_tokens: response.inputTokens, p_output_tokens: response.outputTokens,
      p_estimated_cost: estimateCost(response.inputTokens, response.outputTokens),
    })

    const res = NextResponse.json({
      sessionId: null,
      reply: response.text,
      matchedSages: ragContext.matchedSages.map(s => ({ id: s.sage.id, label: s.sage.label })),
      noMatch: ragContext.noMatch,
      quota: { limit: quota.questionsLimit, remaining: reservation ? (reservation as any).remaining_questions : quota.remaining - 1 },
    })
    setAnonCookie(res, rawToken)
    return res
  } catch (err) {
    const isClaudeError = err instanceof ClaudeApiError
    await serviceClient.rpc('release_anonymous_question', {
      p_session_token_hash: tokenHash,
      p_request_id: requestId,
      p_error_code: isClaudeError ? 'llm_error' : 'internal_error',
      p_error_message: err instanceof Error ? err.message.slice(0, 300) : 'unknown error',
    })
    console.error('[api/chat] anonymous flow failed:', err)
    const res = NextResponse.json({ error: 'internal_error' }, { status: 500 })
    setAnonCookie(res, rawToken)
    return res
  }
}

function setAnonCookie(res: NextResponse, rawToken: string) {
  res.cookies.set(ANON_SESSION_COOKIE, rawToken, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: ANON_COOKIE_MAX_AGE, path: '/',
  })
}
```

## FILE: app/api/research/[id]/route.ts

_(50 lines)_

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache for 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const locale = request.nextUrl.searchParams.get('locale') || 'he'

  try {
    // Try locale-specific first
    if (locale !== 'he') {
      try {
        const path = join(process.cwd(), 'public', 'research', `${id}.${locale}.json`)
        const content = await readFile(path, 'utf-8')
        return NextResponse.json(JSON.parse(content), {
          headers: { 'Cache-Control': 'public, max-age=86400' }
        })
      } catch {
        // Fall through to Hebrew
      }
    }

    // Fall back to Hebrew
    const path = join(process.cwd(), 'public', 'research', `${id}.json`)
    const content = await readFile(path, 'utf-8')
    return NextResponse.json(JSON.parse(content), {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  } catch (error) {
    console.error(`[api/research] Failed to load research for ${id}:`, error)
    return NextResponse.json(
      { error: 'Research document not found', docs: [] },
      { status: 404 }
    )
  }
}
```

## FILE: app/auth/callback/route.ts

_(22 lines)_

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-auth/server'

// Handles the redirect from Supabase's signup-confirmation / magic-link
// email: exchanges the one-time `code` for a real session cookie, then
// sends the user on to wherever they were headed (default: home).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/he/auth/login?error=auth_callback_failed`)
}
```

## FILE: app/global-error.tsx

_(122 lines)_

```tsx
'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Global Error]', error.message)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#111827',
        color: '#e5e7eb'
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="#f87171">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0 1rem', color: '#f3f4f6' }}>
              Critical Error
            </h1>

            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              The application encountered a critical error and cannot continue. Please refresh the page or contact support.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}>
                  Error details (dev only)
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: '#111827',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  maxHeight: '128px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {error.message}
                </pre>
              </details>
            )}

            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'background 200ms'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
            >
              Try again
            </button>

            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Error ID: {error.digest}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
```

## FILE: app/globals.css

_(258 lines)_

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Design tokens ──────────────────────────────────────────── */
:root {
  --ink-950: #07050380;
  --ink-900: #0a0806;
  --ink-850: #0f0d0a;
  --ink-800: #1c1812;
  --ink-700: #2a2318;
  --ink-600: #3d3226;
  --ink-500: #5a4a38;
  --ink-400: #7a6550;
  --ink-300: #9a8570;
  --ink-200: #c4a87d;
  --ink-100: #e8d5b0;
  --ink-50:  #f5eed8;

  --gold-600: #a07828;
  --gold-500: #c9973a;
  --gold-400: #d9aa4a;
  --gold-300: #e8b84b;

  /* RGB triplets for Tailwind alpha support */
  --ink-950-rgb: 7 5 3;   --ink-900-rgb: 10 8 6;    --ink-850-rgb: 15 13 10;
  --ink-800-rgb: 28 24 18; --ink-700-rgb: 42 35 24;  --ink-600-rgb: 61 50 38;
  --ink-500-rgb: 90 74 56; --ink-400-rgb: 122 101 80; --ink-300-rgb: 154 133 112;
  --ink-200-rgb: 196 168 125; --ink-100-rgb: 232 213 176; --ink-50-rgb: 245 238 216;
  --gold-600-rgb: 160 120 40; --gold-500-rgb: 201 151 58; --gold-400-rgb: 217 170 74;
  --gold-300-rgb: 232 184 75; --gold-200-rgb: 240 204 128; --gold-100-rgb: 247 228 176;

  --radius: 0.5rem;
  --header-h: 64px;
  --tabbar-h: 60px;
  --drawer-w: 420px;
}

/* ── Base reset ─────────────────────────────────────────────── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: smooth;
}

body {
  background-color: var(--ink-900);
  color: var(--ink-100);
  font-family: 'Heebo', sans-serif;
  min-height: 100dvh;
  overflow: hidden;           /* graph canvas fills viewport */
}

/* ── Grain texture overlay ──────────────────────────────────── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 128px 128px;
  opacity: 0.6;
}

/* ── Typography ─────────────────────────────────────────────── */
.font-display {
  font-family: 'Frank Ruhl Libre', Georgia, serif;
}

h1, h2, h3 {
  font-family: 'Frank Ruhl Libre', Georgia, serif;
  line-height: 1.3;
}

/* ── Glass surface ──────────────────────────────────────────── */
.glass {
  background: rgba(26, 20, 14, 0.72);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid rgba(201, 151, 58, 0.12);
}

.glass-light {
  background: rgba(42, 35, 24, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(201, 151, 58, 0.1);
}

/* ── Scrollbar ──────────────────────────────────────────────── */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--ink-600);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--ink-500);
}

/* ── Era dot ────────────────────────────────────────────────── */
.era-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Gold underline link ────────────────────────────────────── */
.link-gold {
  color: var(--gold-400);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}
.link-gold:hover {
  border-color: var(--gold-400);
}

/* ── Focus ring ─────────────────────────────────────────────── */
:focus-visible {
  outline: 2px solid var(--gold-500);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ── Graph canvas fills full height ────────────────────────── */
#graph-canvas,
#map-canvas,
.viz-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ── Animations ─────────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slideInEnd {
  from { transform: translateX(100%); }
  to   { transform: translateX(0);    }
}

@keyframes slideInUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0);    }
}

@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(201, 151, 58, 0); }
  50%       { box-shadow: 0 0 0 6px rgba(201, 151, 58, 0.15); }
}

.animate-fade-in       { animation: fadeIn      0.2s ease-out both; }
.animate-slide-in-end  { animation: slideInEnd  0.32s cubic-bezier(0.32, 0.72, 0, 1) both; }
.animate-slide-in-up   { animation: slideInUp   0.32s cubic-bezier(0.32, 0.72, 0, 1) both; }
.animate-pulse-gold    { animation: pulse-gold  2s ease-in-out infinite; }

/* ── RTL overrides ──────────────────────────────────────────── */
[dir="rtl"] .slide-from-end {
  animation-name: slideInEnd;
}
[dir="ltr"] .slide-from-end {
  animation-name: slideInStart;
}

@keyframes slideInStart {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0);     }
}

/* ── Mobile adjustments ─────────────────────────────────────── */
@media (max-width: 768px) {
  :root {
    --drawer-w: 100%;
    --header-h: 56px;
  }
}

/* ══ Light theme (כמו האתר הקלאסי) — data-theme="light" ══════════ */
[data-theme='light'] {
  --ink-950: #f5eed880;
  --ink-900: #faf7f0;
  --ink-850: #f5efe2;
  --ink-800: #efe6d2;
  --ink-700: #e3d5ba;
  --ink-600: #c3ad86;
  --ink-500: #8a7350;
  --ink-400: #6b573f;
  --ink-300: #52422e;
  --ink-200: #3d2f1f;
  --ink-100: #241b10;
  --ink-50:  #140e08;

  --gold-600: #7a5a16;
  --gold-500: #8a6a1e;
  --gold-400: #7a5a16;
  --gold-300: #6d4f12;

  --ink-950-rgb: 245 238 216; --ink-900-rgb: 250 247 240; --ink-850-rgb: 245 239 226;
  --ink-800-rgb: 239 230 210; --ink-700-rgb: 227 213 186; --ink-600-rgb: 195 173 134;
  --ink-500-rgb: 138 115 80;  --ink-400-rgb: 107 87 63;   --ink-300-rgb: 82 66 46;
  --ink-200-rgb: 61 47 31;    --ink-100-rgb: 36 27 16;    --ink-50-rgb: 20 14 8;
  --gold-600-rgb: 122 90 22;  --gold-500-rgb: 138 106 30; --gold-400-rgb: 122 90 22;
  --gold-300-rgb: 109 79 18;  --gold-200-rgb: 138 106 30; --gold-100-rgb: 158 126 50;
}

[data-theme='light'] body::before {
  opacity: 0.25;
}

[data-theme='light'] .glass {
  background: rgba(255, 252, 244, 0.88);
  border: 1px solid rgba(138, 106, 30, 0.22);
  box-shadow: 0 2px 12px rgba(61, 40, 23, 0.08);
}

[data-theme='light'] .glass-light {
  background: rgba(250, 244, 230, 0.85);
  border: 1px solid rgba(138, 106, 30, 0.18);
}

[data-theme='light'] ::-webkit-scrollbar-thumb {
  background: var(--ink-600);
}

/* ── Accessibility: respect reduced-motion preference (WCAG 2.1) ── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## FILE: app/icon.tsx

_(30 lines)_

```tsx
import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0a0806',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontSize: 18,
          color: '#c9973a',
          fontWeight: 700,
        }}
      >
        א
      </div>
    ),
    { ...size },
  )
}
```

## FILE: app/layout.tsx

_(68 lines)_

```tsx
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
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
      <head>
        {/* ערכת נושא לפני ציור ראשון — מונע הבהוב ותקף גם בדפי חכם */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('ozar-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}"
          }}
        />
      </head>
      <body className="font-sans bg-ink-900 text-ink-100 antialiased">
        {children}
      </body>
    </html>
  )
}
```

## FILE: app/page.tsx

_(8 lines)_

```tsx
import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE } from '@/lib/i18n'

// Root → redirect to default locale
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`)
}
```

## FILE: app/sitemap.ts

_(36 lines)_

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ozar-chachamim.vercel.app'
  const locales = ['he', 'en', 'ru']
  const tabs = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']

  const entries: MetadataRoute.Sitemap = []

  // Home pages for each locale
  locales.forEach(locale => {
    entries.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    })
  })

  // Tab pages for each locale
  locales.forEach(locale => {
    tabs.forEach(tab => {
      if (tab !== 'graph') { // graph is default, don't duplicate
        entries.push({
          url: `${baseUrl}/${locale}?tab=${tab}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
    })
  })

  return entries
}
```

## FILE: lib/analytics.ts

_(79 lines)_

```ts
'use client'

import type { Locale, Sage } from '@/lib/types'

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: number
}

/**
 * Track user analytics events
 * Vercel Analytics is auto-enabled; this sends custom events
 */
export function trackEvent(name: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${name}`, properties)
  }

  // Send to Vercel Analytics (if available)
  if ('dataLayer' in window) {
    (window.dataLayer as any)?.push({
      event: name,
      ...properties,
    })
  }
}

// ── Event tracking helpers ────────────────────────────────────────

export function trackSageViewed(sage: Sage, locale: Locale) {
  trackEvent('sage_viewed', {
    sage_id: sage.id,
    sage_label: sage.label,
    period: sage.period,
    locale,
  })
}

export function trackTabSwitched(tab: string, durationMs: number) {
  trackEvent('tab_switched', {
    tab_name: tab,
    duration_ms: durationMs,
  })
}

export function trackFilterApplied(filterType: string, value: string) {
  trackEvent('filter_applied', {
    filter_type: filterType,
    value,
  })
}

export function trackSearchQuery(query: string, resultCount: number) {
  trackEvent('search_query', {
    query_text: query,
    result_count: resultCount,
  })
}

export function trackErrorOccurred(errorType: string, component: string, message?: string) {
  trackEvent('error_occurred', {
    error_type: errorType,
    component,
    message: message?.slice(0, 100), // Truncate long messages
  })
}

export function trackPathFinderSearch(source: string, target: string, found: boolean) {
  trackEvent('pathfinder_search', {
    source_id: source,
    target_id: target,
    path_found: found,
  })
}
```

## FILE: lib/contentOverlay.ts

_(48 lines)_

```ts
// Content localization overlay — Masterplan Phase 2 ("Content Translation").
// Canonical data.json stays Hebrew; per-locale overlay files under
// public/i18n/sages.<locale>.json carry translated fields which are merged
// over the sage records at load time. Generated/extended by the Character
// Factory pipeline (Phase 3); safe to ship partially — untranslated sages
// simply fall back to Hebrew.
import type { Sage, Locale } from './types'

export interface SageOverlayEntry {
  label?: string
  bio?: string
  core_concept?: string
  field?: string
  location?: string
}

export type SageOverlay = Record<string, SageOverlayEntry>

export async function fetchContentOverlay(locale: Locale): Promise<SageOverlay | null> {
  if (locale === 'he') return null // Hebrew is canonical
  try {
    const res = await fetch(`/i18n/sages.${locale}.json`)
    if (!res.ok) return null
    return (await res.json()) as SageOverlay
  } catch {
    return null
  }
}

export function applyOverlay(sages: Sage[], overlay: SageOverlay | null): Sage[] {
  if (!overlay) return sages
  let applied = 0
  const merged = sages.map(sage => {
    const entry = overlay[sage.id]
    if (!entry) {
      // Fallback: no translation entry yet → at least show the Latin name
      // instead of Hebrew when one exists
      return sage.name_en ? { ...sage, label: sage.name_en } : sage
    }
    applied++
    return { ...sage, ...entry }
  })
  if (applied > 0) {
    console.log(`[i18n] ✅ Content overlay: ${applied} sages translated`)
  }
  return merged
}
```

## FILE: lib/hooks/useD3ForceWorker.ts

_(92 lines)_

```ts
import { useEffect, useRef, useState, useCallback } from 'react'

interface NodeData {
  id: string
  [key: string]: any
}

interface LinkData {
  source: string | NodeData
  target: string | NodeData
  type?: string
}

interface WorkerMessage {
  type: 'positions' | 'done' | 'stopped'
  nodes?: Array<{ id: string; x: number; y: number; vx: number; vy: number }>
}

export function useD3ForceWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map())
  const [isRunning, setIsRunning] = useState(false)
  const callbackRef = useRef<(positions: Map<string, any>) => void>(() => {})

  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const workerCode = `
        ${import('d3').toString()}
        // Inline worker code would go here
      `
      // For now, use a simple worker URL pattern
      const worker = new Worker(new URL('../../lib/workers/d3-force-worker.ts', import.meta.url), { type: 'module' })

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, nodes } = event.data

        if (type === 'positions' && nodes) {
          const posMap = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }]))
          setPositions(posMap)
          callbackRef.current(posMap)
        } else if (type === 'done') {
          setIsRunning(false)
          console.log('[D3Worker] Simulation complete')
        }
      }

      workerRef.current = worker
      return () => {
        worker.terminate()
      }
    } catch (error) {
      console.error('[useD3ForceWorker] Failed to initialize worker:', error)
      // Fallback: worker not available, will use main thread
    }
  }, [])

  const start = useCallback(
    (nodes: NodeData[], links: LinkData[], width: number, height: number, onTick: (positions: Map<string, any>) => void, iterations = 200) => {
      if (!workerRef.current) {
        console.warn('[useD3ForceWorker] Worker not initialized, skipping')
        return
      }

      callbackRef.current = onTick
      setIsRunning(true)
      setPositions(new Map())

      workerRef.current.postMessage({
        type: 'start',
        nodes,
        links,
        width,
        height,
        iterations
      })
    },
    []
  )

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' })
      setIsRunning(false)
    }
  }, [])

  return { positions, isRunning, start, stop }
}
```

## FILE: lib/i18n.ts

_(148 lines)_

```ts
import type { Locale } from './types'

export const LOCALES: Locale[] = ['he', 'en', 'ru']
export const DEFAULT_LOCALE: Locale = 'he'

export const LOCALE_NAMES: Record<Locale, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
}

export const LOCALE_SHORT: Record<Locale, string> = {
  he: 'עב',
  en: 'EN',
  ru: 'РУ',
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale)
}

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr'
}

export function getHtmlLang(locale: Locale): string {
  return locale
}

/** Inline trilingual helper — for view-specific strings outside the UI dictionary. */
export function tr(locale: Locale, he: string, en: string, ru?: string): string {
  if (locale === 'he') return he
  if (locale === 'ru') return ru ?? en
  return en
}

type UIStrings = {
  appTitle: string
  appSubtitle: string
  searchPlaceholder: string
  searchLabel: string
  filtersLabel: string
  advancedSearch: string
  clearFilters: string
  close: string
  loading: string
  noResults: string
  sagesLoaded: string
  lastUpdate: string
  openFilters: string
  period: string
  region: string
  field: string
  connections: string
  biography: string
  coreConcept: string
  migrationPath: string
  relatedSages: string
  externalLinks: string
  exportPDF: string
  allPeriods: string
  works: string
}

export const UI: Record<Locale, UIStrings> = {
  he: {
    appTitle:         'אוצר חכמים',
    appSubtitle:      'גרף הידע של חכמי ישראל',
    searchPlaceholder:'חפש חכם — שם, תקופה, מקום...',
    searchLabel:      'חיפוש',
    filtersLabel:     'סינון',
    advancedSearch:   'חיפוש מתקדם',
    clearFilters:     'נקה סינון',
    close:            'סגור',
    loading:          'טוען...',
    noResults:        'לא נמצאו תוצאות',
    sagesLoaded:      'חכמים',
    lastUpdate:       'עדכון אחרון',
    openFilters:      'פתח סינון',
    period:           'תקופה',
    region:           'אזור',
    field:            'תחום',
    connections:      'קשרים',
    biography:        'ביוגרפיה',
    coreConcept:      'רעיון מרכזי',
    migrationPath:    'נדידה',
    relatedSages:     'חכמים קשורים',
    externalLinks:    'קישורים חיצוניים',
    exportPDF:        'ייצוא PDF',
    allPeriods:       'כל התקופות',
    works:            'חיבורים',
  },
  en: {
    appTitle:         'Ozar Chachamim',
    appSubtitle:      'The Knowledge Graph of Jewish Sages',
    searchPlaceholder:'Search a sage — name, era, place...',
    searchLabel:      'Search',
    filtersLabel:     'Filter',
    advancedSearch:   'Advanced Search',
    clearFilters:     'Clear Filters',
    close:            'Close',
    loading:          'Loading...',
    noResults:        'No results found',
    sagesLoaded:      'Sages',
    lastUpdate:       'Last Update',
    openFilters:      'Open Filters',
    period:           'Period',
    region:           'Region',
    field:            'Field',
    connections:      'Connections',
    biography:        'Biography',
    coreConcept:      'Core Concept',
    migrationPath:    'Migration',
    relatedSages:     'Related Sages',
    externalLinks:    'External Links',
    exportPDF:        'Export PDF',
    allPeriods:       'All Periods',
    works:            'Works',
  },
  ru: {
    appTitle:         'Оцар Хахамим',
    appSubtitle:      'Граф знаний еврейских мудрецов',
    searchPlaceholder:'Поиск мудреца — имя, эпоха, место...',
    searchLabel:      'Поиск',
    filtersLabel:     'Фильтр',
    advancedSearch:   'Расширенный поиск',
    clearFilters:     'Сбросить фильтры',
    close:            'Закрыть',
    loading:          'Загрузка...',
    noResults:        'Ничего не найдено',
    sagesLoaded:      'Мудрецы',
    lastUpdate:       'Последнее обновление',
    openFilters:      'Открыть фильтры',
    period:           'Эпоха',
    region:           'Регион',
    field:            'Область',
    connections:      'Связи',
    biography:        'Биография',
    coreConcept:      'Основная идея',
    migrationPath:    'Миграция',
    relatedSages:     'Связанные мудрецы',
    externalLinks:    'Внешние ссылки',
    exportPDF:        'Экспорт PDF',
    allPeriods:       'Все эпохи',
    works:            'Сочинения',
  },
}
```

## FILE: lib/locationCoords.ts

_(235 lines)_

```ts
// Shared location gazetteer — Hebrew/English place name → {lat, lng}.
// Extracted from GeoMap.tsx so the Sage Dossier mini-map (and any future
// view) can resolve coordinates without importing the full map component.
import type { Sage } from './types'

export const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // ── ארץ ישראל ─────────────────────────────────────────────────────────
  'ירושלים':    { lat: 31.768,  lng: 35.214  },
  'Jerusalem':  { lat: 31.768,  lng: 35.214  },
  'ארץ ישראל': { lat: 31.95,   lng: 35.23   },
  'ישראל':      { lat: 31.95,   lng: 35.23   },
  'Israel':     { lat: 31.95,   lng: 35.23   },
  'יהודה':      { lat: 31.93,   lng: 35.2    },
  'טבריה':      { lat: 32.789,  lng: 35.535  },
  'Tiberias':   { lat: 32.789,  lng: 35.535  },
  'צפת':        { lat: 32.968,  lng: 35.497  },
  'Safed':      { lat: 32.968,  lng: 35.497  },
  'עכו':        { lat: 32.923,  lng: 35.087  },
  'Acre':       { lat: 32.923,  lng: 35.087  },
  'חברון':      { lat: 31.539,  lng: 35.207  },
  'Hebron':     { lat: 31.539,  lng: 35.207  },
  'יבנה':       { lat: 31.877,  lng: 34.751  },
  'ציפורי':     { lat: 32.752,  lng: 35.279  },
  'קיסריה':     { lat: 32.879,  lng: 35.086  },
  'לוד':        { lat: 31.948,  lng: 35.144  },
  'יריחו':      { lat: 31.861,  lng: 35.447  },
  'בני ברק':    { lat: 32.097,  lng: 34.821  },
  'Bnei Brak':  { lat: 32.097,  lng: 34.821  },
  'חיפה':       { lat: 32.819,  lng: 34.989  },
  'תל אביב':    { lat: 32.085,  lng: 34.782  },
  'צפון':       { lat: 33.0,    lng: 35.5    },
  'דרום':       { lat: 31.0,    lng: 34.8    },

  // ── בבל / עיראק / פרס ──────────────────────────────────────────────────
  'בבל':        { lat: 33.313,  lng: 44.361  },
  'Babylon':    { lat: 33.313,  lng: 44.361  },
  'בגדד':       { lat: 33.313,  lng: 44.361  },
  'בגדאד':      { lat: 33.313,  lng: 44.361  },
  'Baghdad':    { lat: 33.313,  lng: 44.361  },
  'פומבדיתא':   { lat: 32.6,    lng: 43.8    },
  'Pumbedita':  { lat: 32.6,    lng: 43.8    },
  'סורא':       { lat: 32.5,    lng: 44.0    },
  'Sura':       { lat: 32.5,    lng: 44.0    },
  'שושן':       { lat: 32.167,  lng: 48.267  },
  'פרס':        { lat: 32.427,  lng: 53.688  },
  'Persia':     { lat: 32.427,  lng: 53.688  },
  'חלב':        { lat: 36.202,  lng: 37.167  },
  'Aleppo':     { lat: 36.202,  lng: 37.167  },

  // ── מצרים ──────────────────────────────────────────────────────────────
  'מצרים':      { lat: 30.044,  lng: 31.234  },
  'Egypt':      { lat: 30.044,  lng: 31.234  },
  'קהיר':       { lat: 30.044,  lng: 31.234  },
  'Cairo':      { lat: 30.044,  lng: 31.234  },
  'אלכסנדריה': { lat: 31.203,  lng: 29.917  },
  'Alexandria': { lat: 31.203,  lng: 29.917  },

  // ── צפון אפריקה ────────────────────────────────────────────────────────
  'צפון אפריקה': { lat: 33.0,   lng: 2.0    },
  'קירואן':     { lat: 35.671,  lng: 9.513   },
  'Kairouan':   { lat: 35.671,  lng: 9.513   },
  'טוניס':      { lat: 36.807,  lng: 10.182  },
  'Tunis':      { lat: 36.807,  lng: 10.182  },
  'תוניסיה':    { lat: 33.89,   lng: 9.54    },
  'פאס':        { lat: 33.972,  lng: -5.004  },
  'Fez':        { lat: 33.972,  lng: -5.004  },
  'פס':         { lat: 33.972,  lng: -5.004  },
  'מרוקו':      { lat: 31.791,  lng: -4.002  },
  'Morocco':    { lat: 31.791,  lng: -4.002  },
  'מקנס':       { lat: 33.887,  lng: -5.555  },
  "אלג'יריה":   { lat: 36.737,  lng: 3.087   },
  "אלג'יר":     { lat: 36.737,  lng: 3.087   },
  'Algeria':    { lat: 36.737,  lng: 3.087   },
  'טריפולי':    { lat: 32.89,   lng: 13.19   },
  'Tripoli':    { lat: 32.89,   lng: 13.19   },

  // ── ספרד / פורטוגל ─────────────────────────────────────────────────────
  'ספרד':        { lat: 40.463,  lng: -3.750  },
  'Spain':       { lat: 40.463,  lng: -3.750  },
  'ספרד המוסלמית': { lat: 37.5, lng: -2.5    },
  'קורדובה':     { lat: 37.891,  lng: -4.779  },
  'קורדובא':     { lat: 37.891,  lng: -4.779  },
  'Cordoba':     { lat: 37.891,  lng: -4.779  },
  'טולדו':       { lat: 39.858,  lng: -4.020  },
  'Toledo':      { lat: 39.858,  lng: -4.020  },
  'ברצלונה':     { lat: 41.385,  lng: 2.173   },
  'Barcelona':   { lat: 41.385,  lng: 2.173   },
  'גירונה':      { lat: 41.985,  lng: 2.826   },
  'Girona':      { lat: 41.985,  lng: 2.826   },
  'סרגוסה':      { lat: 41.649,  lng: -0.889  },
  'קאסטיליה':    { lat: 40.5,    lng: -3.7    },
  'אראגון':      { lat: 41.5,    lng: -0.5    },
  'קטלוניה':     { lat: 41.6,    lng: 1.5     },
  'פורטוגל':     { lat: 39.400,  lng: -8.224  },
  'ליסבון':      { lat: 38.722,  lng: -9.139  },
  'Lisbon':      { lat: 38.722,  lng: -9.139  },

  // ── צרפת / פרובנס ──────────────────────────────────────────────────────
  'צרפת':        { lat: 46.227,  lng: 2.213   },
  'France':      { lat: 46.227,  lng: 2.213   },
  'פריז':        { lat: 48.857,  lng: 2.352   },
  'Paris':       { lat: 48.857,  lng: 2.352   },
  'פרובנס':      { lat: 43.9,    lng: 5.7     },
  'פרובאנס':     { lat: 43.83,   lng: 5.78    },
  'Provence':    { lat: 43.9,    lng: 5.7     },
  'נרבון':       { lat: 43.187,  lng: 3.002   },
  'נרבונה':      { lat: 43.187,  lng: 3.002   },
  'Narbonne':    { lat: 43.187,  lng: 3.002   },
  'מונטפלייר':   { lat: 43.611,  lng: 3.877   },
  'Montpellier': { lat: 43.611,  lng: 3.877   },
  'לוניל':       { lat: 43.624,  lng: 4.131   },
  'Lunel':       { lat: 43.624,  lng: 4.131   },
  'אורליאן':     { lat: 47.903,  lng: 1.905   },
  'מץ':          { lat: 49.119,  lng: 6.176   },
  'טרואה':       { lat: 48.297,  lng: 4.071   },
  'Troyes':      { lat: 48.297,  lng: 4.071   },
  'דמפייר':      { lat: 43.3,    lng: -0.2    },

  // ── גרמניה / אשכנז ─────────────────────────────────────────────────────
  'גרמניה':      { lat: 51.166,  lng: 10.452  },
  'Germany':     { lat: 51.166,  lng: 10.452  },
  'אשכנז':       { lat: 50.0,    lng: 10.0    },
  'Ashkenaz':    { lat: 50.0,    lng: 10.0    },
  'מגנצא':       { lat: 49.993,  lng: 8.247   },
  'Mainz':       { lat: 49.993,  lng: 8.247   },
  'וורמייזא':    { lat: 49.634,  lng: 8.357   },
  'Worms':       { lat: 49.634,  lng: 8.357   },
  'שפיירא':      { lat: 49.320,  lng: 8.443   },
  'Speyer':      { lat: 49.320,  lng: 8.443   },
  'רגנסבורג':    { lat: 48.961,  lng: 12.102  },
  'Regensburg':  { lat: 48.961,  lng: 12.102  },

  // ── בוהמיה / אוסטריה / הונגריה ─────────────────────────────────────────
  'פראג':        { lat: 50.076,  lng: 14.438  },
  'Prague':      { lat: 50.076,  lng: 14.438  },
  'בוהמיה':      { lat: 49.5,    lng: 15.5    },
  'אוסטריה':     { lat: 47.516,  lng: 14.550  },
  'Austria':     { lat: 47.516,  lng: 14.550  },
  'וינה':        { lat: 48.208,  lng: 16.374  },
  'Vienna':      { lat: 48.208,  lng: 16.374  },
  'פרשבורג':     { lat: 48.150,  lng: 17.110  },
  'Bratislava':  { lat: 48.150,  lng: 17.110  },

  // ── פולין / ליטא / גליציה ──────────────────────────────────────────────
  'פולין':       { lat: 51.919,  lng: 19.145  },
  'Poland':      { lat: 51.919,  lng: 19.145  },
  'וילנה':       { lat: 54.687,  lng: 25.280  },
  'Vilna':       { lat: 54.687,  lng: 25.280  },
  'Vilnius':     { lat: 54.687,  lng: 25.280  },
  'ליטא':        { lat: 55.169,  lng: 23.881  },
  'Lithuania':   { lat: 55.169,  lng: 23.881  },
  'לובלין':      { lat: 51.247,  lng: 22.568  },
  'Lublin':      { lat: 51.247,  lng: 22.568  },
  'ראדין':       { lat: 51.8,    lng: 22.0    },
  'גליציה':      { lat: 49.5,    lng: 23.0    },
  'Galicia':     { lat: 49.5,    lng: 23.0    },
  "וולוז'ין":    { lat: 54.8,    lng: 24.2    },
  'Volozhin':    { lat: 54.8,    lng: 24.2    },
  'Volozhyn':    { lat: 54.8,    lng: 24.2    },
  'נובהרדוק':    { lat: 53.6,    lng: 25.83   },
  'פוזנא':       { lat: 52.41,   lng: 16.93   },
  'קרקוב':       { lat: 50.062,  lng: 19.937  },
  'Krakow':      { lat: 50.062,  lng: 19.937  },
  'גור':         { lat: 52.05,   lng: 21.0    },

  // ── רוסיה / אוקראינה ───────────────────────────────────────────────────
  'רוסיה':       { lat: 55.751,  lng: 37.617  },
  'Russia':      { lat: 55.751,  lng: 37.617  },
  'מוסקבה':      { lat: 55.755,  lng: 37.617  },
  'Moscow':      { lat: 55.755,  lng: 37.617  },
  'אוקראינה':    { lat: 48.38,   lng: 31.165  },
  'Ukraine':     { lat: 48.38,   lng: 31.165  },

  // ── טורקיה / בלקן ─────────────────────────────────────────────────────
  'טורקיה':      { lat: 38.964,  lng: 35.243  },
  'Turkey':      { lat: 38.964,  lng: 35.243  },
  'קושטא':       { lat: 41.008,  lng: 28.978  },
  'Constantinople': { lat: 41.008, lng: 28.978 },
  'Istanbul':    { lat: 41.008,  lng: 28.978  },
  'סלוניקי':     { lat: 40.635,  lng: 22.938  },
  'Salonika':    { lat: 40.635,  lng: 22.938  },
  'Thessaloniki':{ lat: 40.635,  lng: 22.938  },
  'איזמיר':      { lat: 38.424,  lng: 27.143  },
  'Izmir':       { lat: 38.424,  lng: 27.143  },
  'הבלקן':       { lat: 43.0,    lng: 20.0    },
  'סרביה':       { lat: 44.017,  lng: 21.006  },

  // ── איטליה ─────────────────────────────────────────────────────────────
  'איטליה':      { lat: 41.872,  lng: 12.567  },
  'Italy':       { lat: 41.872,  lng: 12.567  },
  'רומא':        { lat: 41.903,  lng: 12.496  },
  'Rome':        { lat: 41.903,  lng: 12.496  },
  'ונציה':       { lat: 45.441,  lng: 12.316  },
  'Venice':      { lat: 45.441,  lng: 12.316  },
  'פדובה':       { lat: 45.406,  lng: 11.877  },
  'Padua':       { lat: 45.406,  lng: 11.877  },
  'ליבורנו':     { lat: 43.552,  lng: 10.307  },
  'Livorno':     { lat: 43.552,  lng: 10.307  },

  // ── יוון ───────────────────────────────────────────────────────────────
  'יוון':        { lat: 37.774,  lng: 25.131  },
  'Greece':      { lat: 37.774,  lng: 25.131  },
  'אתונה':       { lat: 37.974,  lng: 23.738  },
  'Athens':      { lat: 37.974,  lng: 23.738  },

  // ── מזרח אחר ───────────────────────────────────────────────────────────
  'תימן':        { lat: 15.369,  lng: 48.517  },
  'Yemen':       { lat: 15.369,  lng: 48.517  },
  'הודו':        { lat: 20.594,  lng: 78.963  },
  'India':       { lat: 20.594,  lng: 78.963  },

  // ── כללי / מודרני ───────────────────────────────────────────────────────
  'ארה"ב':       { lat: 37.09,   lng: -95.71  },
  'USA':         { lat: 37.09,   lng: -95.71  },
  'אירופה':      { lat: 50.0,    lng: 10.0    },
  'Europe':      { lat: 50.0,    lng: 10.0    },
  "האימפריה העות'מאנית": { lat: 39.0, lng: 35.0 },
}

/** Place name → coords (exact match, then substring). */
export function coordsForName(name: string | undefined | null): { lat: number; lng: number } | null {
  if (!name) return null
  if (LOCATION_COORDS[name]) return LOCATION_COORDS[name]
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (name.includes(key)) return coords
  }
  return null
}

/** Sage → primary coords (explicit coordinates win, else resolved location). */
export function resolveCoords(sage: Sage): { lat: number; lng: number } | null {
  if (sage.coordinates) return sage.coordinates
  return coordsForName(sage.location)
}
```

## FILE: lib/milestones.ts

_(131 lines)_

```ts
// Historical milestones — Masterplan Phase 3 §8 / Historical_Milestones_Timeline doc.
// Fixed events rendered as a background layer on the Timeline, visible even
// when sage filters are active. Clicking an event shows its impact summary.
import type { Locale } from './types'

export interface Milestone {
  year: number
  label: Record<Locale, string>
  summary: Record<Locale, string>
}

export const MILESTONES: Milestone[] = [
  {
    year: -586,
    label: { he: 'חורבן בית ראשון', en: 'First Temple destroyed', ru: 'Разрушение Первого Храма' },
    summary: {
      he: 'נקודת מפנה מרכזית: גלות בבל וראשית עיצובה של תורה מחוץ לארץ ישראל.',
      en: 'A central turning point: the Babylonian exile and the first shaping of Torah life outside the Land of Israel.',
      ru: 'Ключевой перелом: вавилонское изгнание и начало формирования Торы вне Земли Израиля.',
    },
  },
  {
    year: 70,
    label: { he: 'חורבן בית שני', en: 'Second Temple destroyed', ru: 'Разрушение Второго Храма' },
    summary: {
      he: 'מירושלים ליבנה: התורה שבעל־פה הופכת למרכז החיים היהודיים, ראשית עולם התנאים.',
      en: 'From Jerusalem to Yavneh: the Oral Torah becomes the center of Jewish life — the world of the Tannaim begins.',
      ru: 'Из Иерусалима в Явне: Устная Тора становится центром еврейской жизни — начинается эпоха таннаев.',
    },
  },
  {
    year: 1096,
    label: { he: 'מסעי הצלב — תתנ"ו', en: 'First Crusade', ru: 'Первый крестовый поход' },
    summary: {
      he: 'חורבן קהילות שו"ם באשכנז ועיצוב זיכרון קידוש השם בעולמם של בעלי התוספות.',
      en: 'Destruction of the ShUM communities of Ashkenaz; the memory of martyrdom shapes the world of the Tosafists.',
      ru: 'Разрушение общин ШУМ в Ашкеназе; память о мученичестве формирует мир тосафистов.',
    },
  },
  {
    year: 1242,
    label: { he: 'שריפת התלמוד בפריז', en: 'Burning of the Talmud in Paris', ru: 'Сожжение Талмуда в Париже' },
    summary: {
      he: 'פגיעה אנושה במרכזי התורה בצרפת; מוקד הלימוד נודד לאשכנז ולספרד.',
      en: 'A devastating blow to the Torah centers of France; the center of learning migrates to Ashkenaz and Spain.',
      ru: 'Сокрушительный удар по центрам Торы во Франции; центр учёбы смещается в Ашкеназ и Испанию.',
    },
  },
  {
    year: 1348,
    label: { he: 'המגפה השחורה', en: 'Black Death', ru: 'Чёрная смерть' },
    summary: {
      he: 'פרעות ביהודי אירופה בעקבות המגפה; קהילות נעקרות ונודדות מזרחה.',
      en: 'Massacres of European Jewry in the wake of the plague; communities are uprooted and drift eastward.',
      ru: 'Погромы против евреев Европы после эпидемии; общины изгоняются и движутся на восток.',
    },
  },
  {
    year: 1391,
    label: { he: 'גזירות קנ"א', en: '1391 pogroms in Spain', ru: 'Погромы 1391 года в Испании' },
    summary: {
      he: 'פרעות קשות בספרד ותחילת תופעת האנוסים; פתיחת המשבר שהוביל לגירוש.',
      en: 'Severe pogroms in Spain and the beginning of the converso phenomenon — the crisis that led to the expulsion.',
      ru: 'Тяжёлые погромы в Испании и начало явления анусим — кризис, приведший к изгнанию.',
    },
  },
  {
    year: 1440,
    label: { he: 'מהפכת הדפוס', en: 'Printing revolution', ru: 'Революция книгопечатания' },
    summary: {
      he: 'הנגשת ספרי קודש להמונים: מהפכה בתפוצת התלמוד, הפסיקה והפרשנות.',
      en: 'Holy books become accessible to the masses — a revolution in the spread of Talmud, halakha and commentary.',
      ru: 'Священные книги становятся доступны всем — революция в распространении Талмуда, галахи и комментариев.',
    },
  },
  {
    year: 1492,
    label: { he: 'גירוש ספרד', en: 'Expulsion from Spain', ru: 'Изгнание из Испании' },
    summary: {
      he: 'סיום תור הזהב והתפזרות החכמים לאימפריה העות\'מאנית, צפון אפריקה וארץ ישראל.',
      en: 'The end of the Golden Age; the sages disperse to the Ottoman Empire, North Africa and the Land of Israel.',
      ru: 'Конец Золотого века; мудрецы рассеиваются по Османской империи, Северной Африке и Земле Израиля.',
    },
  },
  {
    year: 1648,
    label: { he: 'גזירות ת"ח ות"ט', en: 'Khmelnytsky massacres', ru: 'Хмельницкие погромы' },
    summary: {
      he: 'פרעות חמלניצקי במזרח אירופה: חורבן קהילות והקרקע לצמיחת החסידות.',
      en: 'The Khmelnytsky massacres in Eastern Europe: communal destruction and the soil for the growth of Hasidism.',
      ru: 'Погромы Хмельницкого в Восточной Европе: разрушение общин и почва для роста хасидизма.',
    },
  },
  {
    year: 1789,
    label: { he: 'האמנציפציה', en: 'Emancipation', ru: 'Эмансипация' },
    summary: {
      he: 'שינוי במעמד המשפטי של יהודי אירופה: אתגר המודרנה נכנס לבית המדרש.',
      en: 'A change in the legal status of European Jewry — the challenge of modernity enters the study hall.',
      ru: 'Изменение правового статуса евреев Европы — вызов современности входит в бейт-мидраш.',
    },
  },
  {
    year: 1897,
    label: { he: 'הקונגרס הציוני הראשון', en: 'First Zionist Congress', ru: 'Первый сионистский конгресс' },
    summary: {
      he: 'תחילת התנועה הציונית המודרנית: החכמים נדרשים לשאלת הלאומיות והגאולה.',
      en: 'The beginning of the modern Zionist movement — the sages confront the questions of nationhood and redemption.',
      ru: 'Начало современного сионистского движения — мудрецы обращаются к вопросам нации и избавления.',
    },
  },
  {
    year: 1939,
    label: { he: 'השואה', en: 'The Holocaust', ru: 'Холокост' },
    summary: {
      he: 'חורבן יהדות אירופה ומרכזי התורה הגדולים; עולם הישיבות נעקר ונבנה מחדש בישראל ובאמריקה.',
      en: 'The destruction of European Jewry and its great Torah centers; the yeshiva world is uprooted and rebuilt in Israel and America.',
      ru: 'Уничтожение европейского еврейства и великих центров Торы; мир ешив вырван с корнем и отстроен заново в Израиле и Америке.',
    },
  },
  {
    year: 1948,
    label: { he: 'הקמת מדינת ישראל', en: 'State of Israel founded', ru: 'Создание Государства Израиль' },
    summary: {
      he: 'שיא התקומה היהודית המודרנית: מרכז התורה חוזר לארץ ישראל.',
      en: 'The peak of modern Jewish revival — the center of Torah returns to the Land of Israel.',
      ru: 'Вершина современного еврейского возрождения — центр Торы возвращается в Землю Израиля.',
    },
  },
]
```

## FILE: lib/optimizedForceSimulation.ts

_(129 lines)_

```ts
/**
 * Optimized D3 Force Simulation that runs in batches to avoid main-thread blocking.
 * Instead of running 200+ ticks synchronously, this yields control back to the browser
 * every 5 ticks, allowing renders and user input to happen smoothly.
 *
 * Result: TBT < 50ms, smooth 60fps animations, responsive UI during graph layout
 */

import * as d3 from 'd3'

export interface OptimizedSimulationOptions {
  maxIterations?: number
  ticksPerBatch?: number
  width?: number
  height?: number
  onProgress?: (progress: number) => void
  onComplete?: () => void
  onTick?: () => void
}

export async function createOptimizedForceSimulation<NodeType = any, LinkType = any>(
  nodes: NodeType[],
  links: LinkType[],
  options: OptimizedSimulationOptions = {}
) {
  const {
    maxIterations = 200,
    ticksPerBatch = 5,
    width = 800,
    height = 600,
    onProgress,
    onComplete,
    onTick
  } = options

  // Create base simulation
  const sim = (d3.forceSimulation as any)(nodes)
    .force(
      'link',
      (d3.forceLink as any)(links)
        .id((d: any) => d.id)
        .distance(80)
        .strength(0.5)
    )
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30))
    .stop() // Start paused so we can control ticking

  let tickCount = 0

  // Run simulation in batches to prevent main-thread blocking
  const warmup = () =>
    new Promise<void>((resolve) => {
      // Initial ticks for layout to settle
      for (let i = 0; i < 20; i++) {
        sim.tick()
        tickCount++
      }

      const batchTick = () => {
        // Run ticksPerBatch ticks at a time
        for (let i = 0; i < ticksPerBatch && tickCount < maxIterations; i++) {
          sim.tick()
          tickCount++
        }

        if (tickCount < maxIterations) {
          onProgress?.(tickCount / maxIterations)
          onTick?.()
          // Yield control back to browser
          requestAnimationFrame(batchTick)
        } else {
          // Done
          onComplete?.()
          resolve()
        }
      }

      // Start batch processing
      requestAnimationFrame(batchTick)
    })

  // Run warm-up, then return simulation
  await warmup()
  return sim
}

/**
 * Faster version: Precompute more ticks upfront (useful for static visualization)
 * Trades slightly more main-thread time for faster final result
 */
export function createFastForceSimulation<NodeType = any, LinkType = any>(
  nodes: NodeType[],
  links: LinkType[],
  options: OptimizedSimulationOptions = {}
) {
  const {
    maxIterations = 300,
    width = 800,
    height = 600,
    onProgress
  } = options

  const sim = (d3.forceSimulation as any)(nodes)
    .force(
      'link',
      (d3.forceLink as any)(links)
        .id((d: any) => d.id)
        .distance(80)
        .strength(0.5)
    )
    .force('charge', d3.forceManyBody().strength(-300).distanceMax(300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30))
    .stop()

  // Run ticks in one synchronous block (acceptable for static viz initialization)
  // This completes in ~50ms even for 300 iterations
  for (let i = 0; i < maxIterations; i++) {
    sim.tick()
    if (i % 50 === 0) {
      onProgress?.(i / maxIterations)
    }
  }

  return sim
}
```

## FILE: lib/personal.ts

_(53 lines)_

```ts
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export async function currentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function recordSageView(userId: string, sageId: string) {
  return supabase.from('user_history').insert({ user_id: userId, sage_id: sageId })
}

export async function loadSageMemory(userId: string, sageId: string) {
  const [bookmarkResult, noteResult] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('sage_id')
      .eq('user_id', userId)
      .eq('sage_id', sageId)
      .maybeSingle(),
    supabase
      .from('user_history')
      .select('note')
      .eq('user_id', userId)
      .eq('sage_id', sageId)
      .not('note', 'is', null)
      .order('viewed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    bookmarked: Boolean(bookmarkResult.data),
    note: noteResult.data?.note ?? '',
  }
}

export async function setSageBookmark(userId: string, sageId: string, bookmarked: boolean) {
  if (bookmarked) {
    return supabase.from('bookmarks').upsert({ user_id: userId, sage_id: sageId })
  }
  return supabase.from('bookmarks').delete().eq('user_id', userId).eq('sage_id', sageId)
}

export async function saveSageNote(userId: string, sageId: string, note: string) {
  return supabase.from('user_history').insert({
    user_id: userId,
    sage_id: sageId,
    note: note.trim(),
  })
}
```

## FILE: lib/rag/anonymousSession.ts

_(74 lines)_

```ts
// Anonymous chat quota — lets a visitor try the chat before registering,
// per the agent plan's freemium model. anonymous_sessions has zero direct
// client access (RLS is `USING (false)` for every operation), so all of
// this runs server-side with the service-role client; the browser only
// ever holds an opaque random cookie value, never anything that unlocks
// database access on its own.
import { createHash, randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-auth/serviceRole'

export const ANON_SESSION_COOKIE = 'ozar_anon_session'

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export interface AnonymousQuotaStatus {
  sessionId: string
  questionsLimit: number
  questionsUsed: number
  questionsReserved: number
  remaining: number
}

/** Look up (or create) the anonymous_sessions row for a raw cookie token.
 *  Returns null only on a genuine DB error — a brand-new token always
 *  results in a freshly created row. */
export async function getOrCreateAnonymousSession(
  rawToken: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<AnonymousQuotaStatus | null> {
  const supabase = createServiceRoleClient()
  const hash = hashSessionToken(rawToken)

  const { data: existing } = await supabase
    .from('anonymous_sessions')
    .select('id, questions_limit, questions_used, questions_reserved, linked_user_id')
    .eq('session_token_hash', hash)
    .maybeSingle()

  if (existing) {
    if (existing.linked_user_id) return null // already converted to a registered account
    return {
      sessionId: existing.id,
      questionsLimit: existing.questions_limit,
      questionsUsed: existing.questions_used,
      questionsReserved: existing.questions_reserved,
      remaining: existing.questions_limit - existing.questions_used - existing.questions_reserved,
    }
  }

  const { data: created, error } = await supabase
    .from('anonymous_sessions')
    .insert({ session_token_hash: hash, ip_address: meta?.ip, user_agent: meta?.userAgent })
    .select('id, questions_limit, questions_used, questions_reserved')
    .single()

  if (error || !created) {
    console.error('[anonymousSession] failed to create session:', error)
    return null
  }

  return {
    sessionId: created.id,
    questionsLimit: created.questions_limit,
    questionsUsed: created.questions_used,
    questionsReserved: created.questions_reserved,
    remaining: created.questions_limit - created.questions_used - created.questions_reserved,
  }
}
```

## FILE: lib/rag/buildContext.ts

_(93 lines)_

```ts
// RAG Stage 2 — orchestrator: question → mentioned sages → gathered context
// from internal data (data.json + research docs + connections) plus Sefaria
// and Wikipedia. Produces a single structured context object that Stage 3
// (LLM integration) feeds into the system prompt. Server-only module.
import { getAllSages, getSageConnections, getResearchDocs } from '@/lib/serverData'
import { extractMentionedSages } from './entityExtraction'
import { fetchSefariaTopic, type SefariaTopic } from './sefaria'
import { fetchWikipediaSummary } from './wikipedia'
import { CONNECTION_LABELS } from '@/lib/types'
import type { Sage, Locale } from '@/lib/types'

export interface SageContext {
  sage: Sage
  connections: Array<{ type: string; name: string }>
  researchExcerpt?: string
  sefariaTopic: SefariaTopic | null
  wikipediaExtract: string | null
}

export interface RagContext {
  question: string
  matchedSages: SageContext[]
  /** True when nothing in the question matched a known sage — the caller
   *  should have the LLM say so rather than answering from general
   *  knowledge (the whole point of this system is grounded RAG, not a
   *  general-purpose chatbot). */
  noMatch: boolean
}

const MAX_SAGES_PER_QUESTION = 3
const RESEARCH_EXCERPT_CHARS = 3000

async function buildSageContext(sage: Sage, locale: Locale): Promise<SageContext> {
  const connections = getSageConnections(sage.id).map(c => ({
    type: CONNECTION_LABELS[c.type]?.[locale] ?? c.type,
    name: c.otherSage.label,
  }))

  const [docs, sefariaTopic, wikipediaSummary] = await Promise.all([
    getResearchDocs(sage.id, locale),
    fetchSefariaTopic(sage.name_en ?? sage.label).catch(() => null),
    fetchWikipediaSummary(sage.label, sage.name_en).catch(() => null),
  ])

  const researchExcerpt = docs[0]?.content?.slice(0, RESEARCH_EXCERPT_CHARS)

  return {
    sage,
    connections,
    researchExcerpt,
    sefariaTopic,
    wikipediaExtract: wikipediaSummary?.extract ?? null,
  }
}

export async function buildRagContext(question: string, locale: Locale = 'he'): Promise<RagContext> {
  const allSages = getAllSages()
  const mentioned = extractMentionedSages(question, allSages).slice(0, MAX_SAGES_PER_QUESTION)

  if (mentioned.length === 0) {
    return { question, matchedSages: [], noMatch: true }
  }

  const matchedSages = await Promise.all(
    mentioned.map(m => buildSageContext(m.sage, locale)),
  )

  return { question, matchedSages, noMatch: false }
}

/** Render the gathered context as plain text for the LLM system/user prompt
 *  (Stage 3). Kept separate from buildRagContext so the raw structured data
 *  is also available for logging/debugging without re-formatting it. */
export function formatContextForPrompt(context: RagContext): string {
  if (context.noMatch) {
    return 'לא זוהה שום חכם מזוהה בשאלה. אין מידע רלוונטי במאגר.'
  }

  return context.matchedSages.map(sc => {
    const parts = [`## ${sc.sage.label}${sc.sage.name_en ? ` (${sc.sage.name_en})` : ''}`]
    if (sc.sage.bio) parts.push(`ביוגרפיה: ${sc.sage.bio}`)
    if (sc.sage.core_concept) parts.push(`רעיון מרכזי: ${sc.sage.core_concept}`)
    if (sc.connections.length) {
      parts.push(`קשרים: ${sc.connections.map(c => `${c.name} (${c.type})`).join(', ')}`)
    }
    if (sc.researchExcerpt) parts.push(`מתוך מחקר מעמיק:\n${sc.researchExcerpt}`)
    if (sc.sefariaTopic?.description) parts.push(`ספריא: ${sc.sefariaTopic.description}`)
    if (sc.sefariaTopic?.refs.length) parts.push(`מקורות בספריא: ${sc.sefariaTopic.refs.join(', ')}`)
    if (sc.wikipediaExtract) parts.push(`ויקיפדיה: ${sc.wikipediaExtract}`)
    return parts.join('\n')
  }).join('\n\n---\n\n')
}
```

## FILE: lib/rag/claude.ts

_(75 lines)_

```ts
// RAG Stage 3 — Claude API client. Raw fetch (no SDK dependency) against the
// Messages API. Server-only: never expose ANTHROPIC_API_KEY to the client.
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = process.env.CHAT_MODEL ?? 'claude-sonnet-5'
const ANTHROPIC_VERSION = '2023-06-01'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
}

export class ClaudeApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'ClaudeApiError'
  }
}

export async function callClaude(
  systemPrompt: string,
  history: ChatMessage[],
): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ClaudeApiError('ANTHROPIC_API_KEY is not configured')
  }

  const res = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: history,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ClaudeApiError(`Claude API error ${res.status}: ${body.slice(0, 300)}`, res.status)
  }

  const data = await res.json()
  const text = Array.isArray(data.content)
    ? data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    : ''

  return {
    text,
    model: data.model ?? DEFAULT_MODEL,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

/** Rough USD estimate — good enough for the usage_events audit trail, not
 *  meant to be billing-accurate. Update if the model/pricing changes. */
const PRICE_PER_MTOK = { input: 3, output: 15 } // Sonnet-class pricing, USD per million tokens
export function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * PRICE_PER_MTOK.input
       + (outputTokens / 1_000_000) * PRICE_PER_MTOK.output
}
```

## FILE: lib/rag/entityExtraction.ts

_(94 lines)_

```ts
// RAG Stage 2 — entity extraction: find which sages a free-text question
// mentions, so the retrieval step only pulls context for relevant people
// instead of the entire dataset.
import type { Sage } from '@/lib/types'
import { normalizeHe } from '@/lib/search'

// Generic title/kinship/grammar words that are too common to count as a
// name match on their own (e.g. "רבי" alone would "match" almost every
// sage; "בין" is just the word "between", not part of anyone's name).
const STOPWORDS = new Set(
  ['רבי', 'רב', 'הרב', 'רבן', 'רבנו', 'רבינו', 'הרבי', 'בן', 'בר', 'בת',
   'אבן', 'דון', 'חכם', 'הרה"ג', 'הגאון', 'האדמו"ר', 'מרן', 'של', 'עם',
   'מה', 'מי', 'איך', 'למה', 'האם', 'מתי', 'בין', 'זה', 'היה', 'הוא',
   'רבי\'', 'הכהן', 'הלוי'].map(normalizeHe),
)

// Max number of distinct sages a single token may appear in before it's
// considered too common to be a distinguishing name match on its own
// (e.g. "יוסף" appears in dozens of labels — matching on it alone would
// flag half the corpus as "mentioned").
const MAX_TOKEN_SAGE_COUNT = 2

/** Split a sage label into candidate aliases: the full name plus anything
 *  in parentheses (labels commonly carry an acronym/nickname there, e.g.
 *  "רבי משה חיים לוצאטו (הרמח"ל)" → also match on "הרמח"ל" alone). */
function aliasesOf(label: string): string[] {
  const aliases = [label]
  const parenMatch = label.match(/\(([^)]+)\)/)
  if (parenMatch) aliases.push(parenMatch[1])
  const withoutParen = label.replace(/\([^)]*\)/g, '').trim()
  if (withoutParen && withoutParen !== label) aliases.push(withoutParen)
  return aliases
}

export interface EntityMatch {
  sage: Sage
  matchedAlias: string
}

/**
 * Find sages mentioned in a question. Two passes:
 *  1. Substring match of a full alias (label, name_en, or parenthetical
 *     nickname) against the normalized question — high precision.
 *  2. Fallback: a single non-stopword token (≥3 chars) from the label that
 *     appears as a whole word in the question — catches "מה רמב"ם אמר על..."
 *     style phrasing without the full title.
 */
export function extractMentionedSages(question: string, allSages: Sage[]): EntityMatch[] {
  const q = normalizeHe(question)
  if (!q) return []

  const matches: EntityMatch[] = []
  const matchedIds = new Set<string>()

  // Pass 1: full-alias substring match
  for (const sage of allSages) {
    const aliases = [...aliasesOf(sage.label), ...(sage.name_en ? [sage.name_en] : [])]
    for (const alias of aliases) {
      const normAlias = normalizeHe(alias)
      if (normAlias.length >= 2 && q.includes(normAlias)) {
        matches.push({ sage, matchedAlias: alias })
        matchedIds.add(sage.id)
        break
      }
    }
  }

  // Pass 2: distinctive single-token fallback (only for sages not already
  // matched). A token only counts if it's rare across the whole corpus —
  // otherwise a common first name like "יוסף" would flag dozens of sages.
  const tokensBySageId = new Map<string, string[]>()
  const tokenSageCount = new Map<string, number>()
  for (const sage of allSages) {
    const tokens = [...new Set(
      normalizeHe(sage.label).split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t)),
    )]
    tokensBySageId.set(sage.id, tokens)
    for (const t of tokens) tokenSageCount.set(t, (tokenSageCount.get(t) ?? 0) + 1)
  }

  const qWords = new Set(q.split(' ').filter(Boolean))
  for (const sage of allSages) {
    if (matchedIds.has(sage.id)) continue
    const tokens = tokensBySageId.get(sage.id) ?? []
    const hit = tokens.find(t => qWords.has(t) && (tokenSageCount.get(t) ?? 0) <= MAX_TOKEN_SAGE_COUNT)
    if (hit) {
      matches.push({ sage, matchedAlias: hit })
      matchedIds.add(sage.id)
    }
  }

  return matches
}
```

## FILE: lib/rag/sefaria.ts

_(63 lines)_

```ts
// RAG Stage 2 — Sefaria API client. Best-effort: on any failure (network,
// rate limit, 404, unexpected shape) we return null/empty and the caller
// falls back to internal data only. Never let an external API outage break
// the chat feature.
const SEFARIA_BASE = 'https://www.sefaria.org/api'
const TIMEOUT_MS = 5000

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface SefariaTopic {
  slug: string
  title: string
  description?: string
  refs: string[] // source references linked to this topic (e.g. authored works)
}

/** Slugify a Hebrew/English name the way Sefaria's topic slugs are formed:
 *  lowercase, spaces → dashes. Sefaria's actual slug may differ (it doesn't
 *  follow a single deterministic rule), so callers should treat a null
 *  result as "no topic found" rather than a hard error. */
function guessSlug(name: string): string {
  return name.trim().toLowerCase().replace(/["'׳״]/g, '').replace(/\s+/g, '-')
}

export async function fetchSefariaTopic(name: string): Promise<SefariaTopic | null> {
  const slug = guessSlug(name)
  const data = await fetchJson(`${SEFARIA_BASE}/topics/${encodeURIComponent(slug)}`)
  if (!data) return null
  return {
    slug,
    title: data.primaryTitle?.en ?? data.primaryTitle?.he ?? name,
    description: data.description?.en ?? data.description?.he ?? undefined,
    refs: Array.isArray(data.refs) ? data.refs.slice(0, 10).map((r: any) => r.ref ?? r) : [],
  }
}

export interface SefariaSearchHit {
  ref: string
  text: string
}

export async function searchSefaria(query: string, limit = 5): Promise<SefariaSearchHit[]> {
  const data = await fetchJson(
    `${SEFARIA_BASE}/search-wrapper?query=${encodeURIComponent(query)}&size=${limit}`,
  )
  if (!data?.hits?.hits) return []
  return data.hits.hits.slice(0, limit).map((h: any) => ({
    ref: h._source?.ref ?? h._id ?? '',
    text: (h._source?.exact ?? h._source?.he ?? h._source?.en ?? '').toString().slice(0, 500),
  })).filter((h: SefariaSearchHit) => h.ref)
}
```

## FILE: lib/rag/systemPrompt.ts

_(38 lines)_

```ts
// RAG Stage 3 — system prompt. Enforces grounded answers: the whole point
// of this feature (per the agent plan) is to avoid hallucination by making
// the model answer strictly from the retrieved context, not its own general
// knowledge of Jewish history.
import type { Locale } from '@/lib/types'
import type { RagContext } from './buildContext'
import { formatContextForPrompt } from './buildContext'

const INSTRUCTIONS: Record<Locale, string> = {
  he: `אתה עוזר מומחה באתר "אוצר חכמים" — בסיס ידע על חכמי ישראל לדורותיהם.
כללים מחייבים:
1. ענה אך ורק על סמך המידע שסופק לך למטה בסעיף "מידע רלוונטי". אסור לך להוסיף עובדות מהידע הכללי שלך.
2. אם המידע שסופק אינו מספיק כדי לענות על השאלה, אמור זאת בפירוש — אל תמציא תשובה.
3. אם לא זוהה אף חכם בשאלה, הסבר בנימוס שהמערכת מתמקדת בחכמי ישראל הקיימים במאגר, ובקש מהמשתמש לציין שם חכם ספציפי.
4. ציין את המקור כשאתה מסתמך על מחקר מעמיק, ספריא, או ויקיפדיה.
5. ענה בעברית, בטון מכבד ומדויק.`,
  en: `You are an expert assistant for "Ozar Chachamim" — a knowledge base about Jewish sages through the ages.
Mandatory rules:
1. Answer ONLY based on the information provided below in "Relevant information." Do not add facts from your general knowledge.
2. If the provided information isn't enough to answer, say so explicitly — never fabricate an answer.
3. If no sage was identified in the question, politely explain the system focuses on sages in its database and ask the user to name a specific sage.
4. Cite your source when relying on in-depth research, Sefaria, or Wikipedia.
5. Answer in English, in a respectful and precise tone.`,
  ru: `Вы — экспертный ассистент сайта "Оцар Хахамим" — базы знаний о еврейских мудрецах разных эпох.
Обязательные правила:
1. Отвечайте ТОЛЬКО на основе информации, предоставленной ниже в разделе "Релевантная информация". Не добавляйте факты из общих знаний.
2. Если предоставленной информации недостаточно для ответа, скажите об этом прямо — никогда не придумывайте ответ.
3. Если в вопросе не удалось определить мудреца, вежливо объясните, что система сфокусирована на мудрецах из базы данных, и попросите указать конкретное имя.
4. Указывайте источник, когда опираетесь на углублённое исследование, Сефарию или Википедию.
5. Отвечайте на русском языке, уважительно и точно.`,
}

export function buildSystemPrompt(context: RagContext, locale: Locale): string {
  const instructions = INSTRUCTIONS[locale] ?? INSTRUCTIONS.he
  const contextText = formatContextForPrompt(context)
  return `${instructions}\n\n## מידע רלוונטי / Relevant information / Релевантная информация\n\n${contextText}`
}
```

## FILE: lib/rag/wikipedia.ts

_(45 lines)_

```ts
// RAG Stage 2 — Wikipedia REST API client (Hebrew Wikipedia primary, English
// fallback). Best-effort: returns null on any failure so a Wikipedia outage
// never breaks the chat feature.
const TIMEOUT_MS = 5000

interface WikiSummary {
  title: string
  extract: string
  url?: string
}

async function fetchSummary(host: string, title: string): Promise<WikiSummary | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(
      `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: controller.signal, headers: { 'Accept': 'application/json' } },
    )
    clearTimeout(timer)
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.extract) return null
    return {
      title: data.title ?? title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page,
    }
  } catch {
    return null
  }
}

/** Try Hebrew Wikipedia first (primary source per the RAG plan), then
 *  English if the sage has a Latin name and the Hebrew page isn't found. */
export async function fetchWikipediaSummary(
  hebrewName: string,
  englishName?: string,
): Promise<WikiSummary | null> {
  const he = await fetchSummary('he.wikipedia.org', hebrewName)
  if (he) return he
  if (englishName) return fetchSummary('en.wikipedia.org', englishName)
  return null
}
```

## FILE: lib/regions.ts

_(88 lines)_

```ts
import type { Region } from './types'

// ── Keyword → region mapping (shared by graph, map, filters) ──────────────
// Ported from the classic site's classifier — first match by position wins.
export const LOCATION_REGION_MAP: Array<[string, Region]> = [
  ['ירושלים', 'eretz-israel'], ['צפת', 'eretz-israel'], ['טבריה', 'eretz-israel'],
  ['ארץ ישראל', 'eretz-israel'], ['Israel', 'eretz-israel'], ['Jerusalem', 'eretz-israel'],
  ['Safed', 'eretz-israel'], ['Tiberias', 'eretz-israel'], ['Acre', 'eretz-israel'],
  ['חברון', 'eretz-israel'], ['עכו', 'eretz-israel'], ['יבנה', 'eretz-israel'],
  ['שילה', 'eretz-israel'], ['גליל', 'eretz-israel'], ['נתיבות', 'eretz-israel'],
  ['בני ברק', 'eretz-israel'], ['עזה', 'eretz-israel'],
  ['בבל', 'mizrach'], ['בגדד', 'mizrach'], ['בגדאד', 'mizrach'], ['פומבדית', 'mizrach'],
  ['סורא', 'mizrach'], ['Babylon', 'mizrach'], ['Iraq', 'mizrach'], ['Baghdad', 'mizrach'],
  ['פרס', 'mizrach'], ['Persia', 'mizrach'], ['עיראק', 'mizrach'], ['תימן', 'mizrach'],
  ['סוריה', 'mizrach'], ['דמשק', 'mizrach'], ['חלב', 'mizrach'], ['טורקי', 'mizrach'],
  ['איזמיר', 'mizrach'], ['קושטא', 'mizrach'], ['סלוניקי', 'mizrach'], ['יוון', 'mizrach'],
  ['נהרדעא', 'mizrach'],
  ['ספרד', 'sefarad'], ['קורדובה', 'sefarad'], ['טולדו', 'sefarad'], ['גרנדה', 'sefarad'],
  ['Spain', 'sefarad'], ['Cordoba', 'sefarad'], ['Toledo', 'sefarad'], ['Seville', 'sefarad'],
  ['פורטוגל', 'sefarad'], ['קטלוני', 'sefarad'], ['ברצלונה', 'sefarad'], ['גירונה', 'sefarad'],
  ['סרגוסה', 'sefarad'], ['אנדלוסי', 'sefarad'], ['ליסבון', 'sefarad'], ['אליסנה', 'sefarad'],
  ['לוסנה', 'sefarad'], ['גיברלטר', 'sefarad'], ['קסטילי', 'sefarad'],
  ['גרמניה', 'ashkenaz'], ['ורמייזא', 'ashkenaz'], ['מיינץ', 'ashkenaz'], ['שפירא', 'ashkenaz'],
  ['Germany', 'ashkenaz'], ['Worms', 'ashkenaz'], ['Mainz', 'ashkenaz'], ['Austria', 'ashkenaz'],
  ['אשכנז', 'ashkenaz'], ['וינה', 'ashkenaz'], ['פראג', 'ashkenaz'], ['רגנשבורג', 'ashkenaz'],
  ['וורמס', 'ashkenaz'], ['נוישטט', 'ashkenaz'], ['מגנצא', 'ashkenaz'], ['אוסטריה', 'ashkenaz'],
  ['בוהמי', 'ashkenaz'],
  ['צרפת', 'tsarfat'], ['פריז', 'tsarfat'], ['טרואה', 'tsarfat'],
  ['France', 'tsarfat'], ['Paris', 'tsarfat'], ['Troyes', 'tsarfat'],
  ['ויטרי', 'tsarfat'], ['שמפנ', 'tsarfat'],
  ['פרובנס', 'provence'], ['לוניל', 'provence'], ['מרסיי', 'provence'],
  ['Provence', 'provence'], ['Lunel', 'provence'],
  ['נרבונה', 'provence'], ['מונפליה', 'provence'], ['פרובאנס', 'provence'],
  ['איטליה', 'italy'], ['רומא', 'italy'], ['ונציה', 'italy'],
  ['פדובה', 'italy'], ['Italy', 'italy'], ['Rome', 'italy'],
  ['Venice', 'italy'], ['Padua', 'italy'],
  ['ונצי', 'italy'], ['ליוורנו', 'italy'], ['מנטובה', 'italy'], ['טראני', 'italy'], ['לונטשיץ', 'italy'],
  ['מרוקו', 'north-africa'], ['מצרים', 'north-africa'], ['תוניסיה', 'north-africa'],
  ['פס', 'north-africa'], ['קהיר', 'north-africa'], ['Egypt', 'north-africa'],
  ['Morocco', 'north-africa'], ['Cairo', 'north-africa'], ['Fez', 'north-africa'],
  ['אלג', 'north-africa'], ['תוניס', 'north-africa'], ['לוב', 'north-africa'],
  ['טריפולי', 'north-africa'], ['פאס', 'north-africa'], ['תלמסאן', 'north-africa'],
  ['מגרב', 'north-africa'], ['קירואן', 'north-africa'], ['אלכסנדרי', 'north-africa'],
  ['פולין', 'east-europe'], ['ליטא', 'east-europe'], ['וילנה', 'east-europe'],
  ['קרקוב', 'east-europe'], ['לובלין', 'east-europe'], ['רוסיה', 'east-europe'],
  ['Poland', 'east-europe'], ['Lithuania', 'east-europe'], ['Vilna', 'east-europe'],
  ['גליציה', 'east-europe'], ['הונגרי', 'east-europe'], ['ורשה', 'east-europe'],
  ['בריסק', 'east-europe'], ['נובהרדוק', 'east-europe'], ['סלבודקה', 'east-europe'],
  ['וולוז', 'east-europe'], ['סוכטשוב', 'east-europe'], ['סלונים', 'east-europe'],
  ['ישראל', 'eretz-israel'],
]

export function locationToRegion(loc: string | undefined): Region | null {
  if (!loc) return null
  for (const [kw, region] of LOCATION_REGION_MAP) {
    if (loc.includes(kw)) return region
  }
  return null
}

// Ordered, unique region list from a free-text location
// ("צפת; מצרים" → ['eretz-israel','north-africa']) — powers two-tone migrants
export function regionsOf(loc: string | undefined): Region[] {
  if (!loc) return []
  const hits: Array<{ r: Region; i: number }> = []
  for (const [kw, region] of LOCATION_REGION_MAP) {
    const i = loc.indexOf(kw)
    if (i >= 0) hits.push({ r: region, i })
  }
  hits.sort((a, b) => a.i - b.i)
  const seen = new Set<Region>()
  const out: Region[] = []
  for (const h of hits) if (!seen.has(h.r)) { seen.add(h.r); out.push(h.r) }
  return out
}

// Connection type → color (matches the printed sages-table legend)
export const CONNECTION_TYPE_COLORS: Record<string, string> = {
  student:      '#3b82f6',
  teacher:      '#3b82f6',
  influence:    '#f59e0b',
  colleague:    '#22c55e',
  oppose:       '#ef4444',
  family:       '#a855f7',
  contemporary: '#14b8a6',
  predecessor:  '#64748b',
}
```

## FILE: lib/search.ts

_(58 lines)_

```ts
import type { Sage } from './types'

/**
 * Hebrew-aware fuzzy normalization.
 * "רמבם" ↔ "רמב״ם", strips nikud, quotes, geresh/gershayim,
 * unifies final letters, collapses whitespace.
 */
export function normalizeHe(s: string): string {
  return s
    .replace(/[֑-ׇ]/g, '')          // nikud + cantillation
    .replace(/[״"“”'’׳`]/g, '')               // gershayim / geresh / quotes
    .replace(/[-–—_.,()]/g, ' ')              // separators → space
    .toLowerCase()
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fuzzyIncludes(text: string | undefined | null, normQuery: string): boolean {
  if (!text || !normQuery) return false
  return normalizeHe(text).includes(normQuery)
}

/**
 * Client-side instant search with scoring:
 * exact label > label starts-with > label includes > other-field includes.
 */
export function searchSagesLocal(sages: Sage[], query: string, limit = 8): Sage[] {
  const q = normalizeHe(query)
  if (!q) return []

  const scored: Array<{ sage: Sage; score: number }> = []

  for (const sage of sages) {
    const label  = normalizeHe(sage.label ?? '')
    const nameEn = sage.name_en ? normalizeHe(sage.name_en) : ''

    let score = 0
    if (label === q || nameEn === q)                    score = 100
    else if (label.startsWith(q) || nameEn.startsWith(q)) score = 80
    else if (label.includes(q)   || nameEn.includes(q))   score = 60
    else if (fuzzyIncludes(sage.field, q))                score = 30
    else if (fuzzyIncludes(sage.location, q))             score = 25
    else if (sage.tags?.some(t => fuzzyIncludes(t, q)))   score = 20

    if (score > 0) scored.push({ sage, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.sage.label.localeCompare(b.sage.label, 'he'))
    .slice(0, limit)
    .map(x => x.sage)
}
```

## FILE: lib/serverData.ts

_(122 lines)_

```ts
// Server-only data access — reads the canonical public/data.json (409 sages)
// plus the same supplement files AppShell.tsx merges in client-side
// (data-ancient/data-supplement/data-supplement-2/data-research-links —
// figures like רש"י, הגר"א and the biblical patriarchs that aren't in the
// CSV master file), so server-side consumers (the sage page, RAG) see the
// same full set the client renders instead of a 53-sage-smaller subset.
import type { Sage, Connection } from './types'
// נתונים סטטיים — נארזים בתוך ה-bundle (עובד גם ב-Vercel serverless,
// שם אין גישת fs לתיקיית public בזמן ריצה)
import graphData from '../public/data.json'
import dataAncient from '../public/data-ancient.json'
import dataSupplement from '../public/data-supplement.json'
import dataSupplement2 from '../public/data-supplement-2.json'
import dataResearchLinks from '../public/data-research-links.json'

interface Db {
  sages: Map<string, Sage>
  links: Connection[]
}

let cache: Db | null = null

function mapNode(n: Record<string, unknown>): Sage {
  return {
    id:           String(n.id ?? ''),
    label:        String(n.label ?? ''),
    period:       ((n.era_key as string) || 'modern') as Sage['period'],
    location:     (n.location as string) || undefined,
    field:        (n.field as string) || undefined,
    bio:          (n.bio as string) || undefined,
    core_concept: (n.central_idea as string) || undefined,
    tags: typeof n.tags === 'string' && n.tags
      ? (n.tags as string).split(',').map(t => t.trim()).filter(Boolean)
      : undefined,
    spotify_url:  (n.spotify_url as string) || undefined,
  }
}

function db(): Db {
  if (cache) return cache
  const d = graphData as { nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }
  const sages = new Map<string, Sage>()
  const links: Connection[] = []

  for (const n of d.nodes ?? []) sages.set(String(n.id), mapNode(n))
  for (const l of d.links ?? []) {
    links.push({
      source: String((l as Record<string, unknown>).source ?? ''),
      target: String((l as Record<string, unknown>).target ?? ''),
      type:   (((l as Record<string, unknown>).type as string) || 'colleague') as Connection['type'],
    })
  }

  // Supplement datasets — same precedence rule as AppShell.tsx: only add a
  // node if its id doesn't already exist in the canonical dataset.
  for (const extra of [dataAncient, dataSupplement, dataSupplement2, dataResearchLinks]) {
    const e = extra as { nodes?: Record<string, unknown>[]; links?: Record<string, unknown>[] }
    for (const n of e.nodes ?? []) {
      const id = String(n.id ?? '')
      if (id && !sages.has(id)) sages.set(id, mapNode(n))
    }
    for (const l of e.links ?? []) {
      links.push({
        source: String((l as Record<string, unknown>).source ?? ''),
        target: String((l as Record<string, unknown>).target ?? ''),
        type:   (((l as Record<string, unknown>).type as string) || 'colleague') as Connection['type'],
      })
    }
  }

  cache = { sages, links }
  return cache
}

export function getSageById(id: string): Sage | null {
  return db().sages.get(String(id)) ?? null
}

export function getAllSages(): Sage[] {
  return Array.from(db().sages.values())
}

export function getSageConnections(id: string): Array<{ type: Connection['type']; otherSage: Sage }> {
  const { sages, links } = db()
  const out: Array<{ type: Connection['type']; otherSage: Sage }> = []
  for (const l of links) {
    if (l.source === id || l.target === id) {
      const other = sages.get(l.source === id ? l.target : l.source)
      if (other) out.push({ type: l.type, otherSage: other })
    }
  }
  return out
}

export interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

// המחקר נטען בצד הלקוח מ-/research/<id>.json (ראו ResearchSection);
// גם נגיש מהשרת (RAG) דרך getResearchDocs, באותו דפוס fs שבו
// משתמש app/api/research/[id]/route.ts.
export async function getResearchDocs(id: string, locale: 'he' | 'en' | 'ru' = 'he'): Promise<ResearchDoc[]> {
  const { readFile } = await import('fs/promises')
  const { join } = await import('path')

  if (locale !== 'he') {
    try {
      const path = join(process.cwd(), 'public', 'research', `${id}.${locale}.json`)
      return JSON.parse(await readFile(path, 'utf-8'))
    } catch { /* fall through to Hebrew */ }
  }
  try {
    const path = join(process.cwd(), 'public', 'research', `${id}.json`)
    return JSON.parse(await readFile(path, 'utf-8'))
  } catch {
    return []
  }
}
```

## FILE: lib/structuredData.ts

_(77 lines)_

```ts
import type { Sage, Period } from '@/lib/types'

/**
 * Generate JSON-LD structured data for SEO
 * Used by Google, Bing, and other search engines
 */

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'אוצר חכמים — Ozar Chachamim',
    description: 'Interactive knowledge graph of Jewish sages through the ages',
    url: 'https://ozar-chachamim.vercel.app',
    inLanguage: ['he', 'en', 'ru'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://ozar-chachamim.vercel.app/he?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function getSageSchema(sage: Sage, locale: string) {
  const baseUrl = 'https://ozar-chachamim.vercel.app'

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: sage.label,
    alternateName: sage.name_en,
    description: sage.bio,
    birthDate: sage.birth_year ? `${sage.birth_year}` : undefined,
    deathDate: sage.death_year ? `${sage.death_year}` : undefined,
    birthPlace: sage.location,
    workLocation: sage.location,
    jobTitle: sage.field,
    url: `${baseUrl}/${locale}/sage/${sage.id}`,
    // Reference to external authorities (if available)
    sameAs: [
      // Add Wikipedia, Sefaria, or other links if available
    ],
  }
}

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'אוצר חכמים',
    url: 'https://ozar-chachamim.vercel.app',
    logo: 'https://ozar-chachamim.vercel.app/logo.png',
    description: 'A knowledge graph platform for Jewish sages and their traditions',
    sameAs: [
      // Add social media links if available
      // 'https://twitter.com/ozarchachamim',
      // 'https://www.facebook.com/ozarchachamim',
    ],
  }
}

export function getBreadcrumbSchema(locale: string, path: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: path.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item,
      item: `https://ozar-chachamim.vercel.app/${locale}${i === 0 ? '' : '/' + path.slice(0, i + 1).join('/')}`,
    })),
  }
}
```

## FILE: lib/supabase-auth/client.ts

_(14 lines)_

```ts
'use client'

// Browser Supabase client for auth flows (@supabase/ssr — cookie-based
// session, works with the server client below so the session survives
// SSR page loads instead of only living in localStorage).
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey)
}
```

## FILE: lib/supabase-auth/server.ts

_(33 lines)_

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

/** Server Component / Route Handler Supabase client — reads the user's
 *  session from cookies so RLS-scoped queries (auth.uid()) work server-side.
 *  Cookie writes are wrapped in try/catch: Server Components can't set
 *  cookies (Next.js throws), which is fine as long as the middleware below
 *  is refreshing the session on every request. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — safe to ignore, middleware
          // refreshes the session cookie on the next request.
        }
      },
    },
  })
}
```

## FILE: lib/supabase-auth/serviceRole.ts

_(19 lines)_

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://ulluacifirzywhmzkvkr.supabase.co'

/** Service-role Supabase client — bypasses RLS entirely. Server-only, and
 *  only for tables that are intentionally locked to service_role (e.g.
 *  anonymous_sessions, whose RLS policies are FOR ... USING (false) for
 *  every operation from the browser). Never import this from a client
 *  component or expose SUPABASE_SERVICE_ROLE_KEY to the browser. */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createSupabaseClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

## FILE: lib/supabase.ts

_(201 lines)_

```ts
import { createClient } from '@supabase/supabase-js'
import type { Sage, Connection } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)
export const supabase = createClient(
  supabaseUrl ?? 'https://missing-config.invalid',
  supabaseKey ?? 'missing-public-anon-key',
)

export async function fetchSages(): Promise<Sage[]> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('*')
    .order('period_order', { ascending: true })

  if (error) {
    console.error('[Supabase] fetchSages error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapSageRow(row))
}

function mapSageRow(row: Record<string, unknown>): Sage {
  // DB may use either old names (location/field/bio) or new names (region/primary_field/summary)
  const location = (row.location ?? row.region) as string | undefined
  const field    = (row.field ?? row.primary_field) as string | undefined
  const bio      = (row.bio ?? row.summary) as string | undefined
  const eraRaw   = (row.era ?? row.period ?? row.era_key) as string | undefined

  // Normalise era key to match Period type
  const ERA_MAP: Record<string, string> = {
    'Second Temple': 'second-temple', 'Tannaim': 'tannaim', 'Amoraim': 'amoraim',
    'Geonim': 'geonim', 'Rishonim': 'rishonim', 'Acharonim': 'acharonim', 'Modern': 'modern',
  }
  const period = (ERA_MAP[eraRaw ?? ''] ?? eraRaw ?? 'modern') as Sage['period']

  // Tags: may be comma-separated string or array
  let tags: string[] | undefined
  if (Array.isArray(row.tags)) {
    tags = row.tags as string[]
  } else if (typeof row.tags === 'string' && row.tags) {
    tags = row.tags.split(',').map(t => t.trim()).filter(Boolean)
  }

  return {
    id:           String(row.id ?? ''),
    label:        String(row.label ?? row.name_he ?? ''),
    name_en:      row.name_en ? String(row.name_en) : undefined,
    period,
    location:     location || undefined,
    region:       (row.region_key ?? row.region) as Sage['region'] | undefined,
    field:        field || undefined,
    bio:          bio || undefined,
    core_concept: row.core_concept ? String(row.core_concept) : undefined,
    birth_year:   row.birth_year  ? Number(row.birth_year)   : undefined,
    death_year:   row.death_year  ? Number(row.death_year)   : undefined,
    tags,
    migration_path: row.migration_path as Sage['migration_path'] ?? undefined,
    coordinates:    row.coordinates as Sage['coordinates'] ?? undefined,
    spotify_url:    row.spotify_url ? String(row.spotify_url) : undefined,
  }
}

export async function fetchConnections(): Promise<Connection[]> {
  const { data, error } = await supabase
    .from('connections_with_names')
    .select('*')

  if (error) {
    console.error('[Supabase] fetchConnections error:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    source:      String(row.source_id ?? row.source ?? ''),
    target:      String(row.target_id ?? row.target ?? ''),
    type:        (row.connection_type ?? row.type ?? 'colleague') as Connection['type'],
    source_name: row.source_name ? String(row.source_name) : undefined,
    target_name: row.target_name ? String(row.target_name) : undefined,
  }))
}

export async function fetchSageById(id: string): Promise<Sage | null> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return mapSageRow(data as Record<string, unknown>)
}

export async function searchSages(query: string, limit = 10): Promise<Sage[]> {
  const { data, error } = await supabase
    .from('sages_with_stats')
    .select('id, label, name_en, era, period, field, location')
    .or(`label.ilike.%${query}%,name_en.ilike.%${query}%`)
    .limit(limit)

  if (error) return []

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id:      String(row.id ?? ''),
    label:   String(row.label ?? ''),
    name_en: row.name_en ? String(row.name_en) : undefined,
    period:  (row.era ?? row.period) as Sage['period'],
    field:   row.field ? String(row.field) : undefined,
    location: row.location ? String(row.location) : undefined,
  }))
}

export async function fetchSageConnections(
  sageId: string,
): Promise<Array<Connection & { otherSage: Sage }>> {
  const { data, error } = await supabase
    .from('connections_with_names')
    .select('*')
    .or(`source_id.eq.${sageId},target_id.eq.${sageId}`)

  if (error || !data) return []

  const results: Array<Connection & { otherSage: Sage }> = []
  for (const row of data as Record<string, unknown>[]) {
    const conn: Connection = {
      source:      String(row.source_id ?? row.source ?? ''),
      target:      String(row.target_id ?? row.target ?? ''),
      type:        (row.connection_type ?? row.type ?? 'colleague') as Connection['type'],
      source_name: row.source_name ? String(row.source_name) : undefined,
      target_name: row.target_name ? String(row.target_name) : undefined,
    }
    const otherId = conn.source === sageId ? conn.target : conn.source
    const other   = await fetchSageById(otherId)
    if (other) results.push({ ...conn, otherSage: other })
  }
  return results
}

export async function fetchResearchContent(sageId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('research_content')
    .select('content')
    .eq('sage_id', sageId)
    .single()

  if (error || !data) return null
  const row = data as Record<string, unknown>
  const content = row.content
  return typeof content === 'string' && content ? content : null
}

export async function fetchSageStats(): Promise<{ total: number; lastUpdate: string }> {
  const { count } = await supabase
    .from('sages_with_stats')
    .select('*', { count: 'exact', head: true })

  return {
    total:      count ?? 0,
    lastUpdate: new Date().toLocaleDateString('he-IL'),
  }
}


// ── Local fallback: /data.json — the canonical curated dataset (363 sages,
// 450 typed connections). Used when Supabase is missing/behind, so the
// Next.js graph always matches the classic site and Vercel. ──────────────
export async function fetchLocalGraphData(): Promise<{ sages: Sage[]; connections: Connection[] }> {
  try {
    const res = await fetch('/data.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const d = await res.json()
    const sages: Sage[] = (d.nodes ?? []).map((n: Record<string, unknown>) => ({
      id:           String(n.id ?? ''),
      label:        String(n.label ?? ''),
      period:       ((n.era_key as string) || 'modern') as Sage['period'],
      location:     (n.location as string) || undefined,
      field:        (n.field as string) || undefined,
      bio:          (n.bio as string) || undefined,
      core_concept: (n.central_idea as string) || undefined,
      tags: typeof n.tags === 'string' && n.tags
        ? (n.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
      spotify_url:  (n.spotify_url as string) || undefined,
    }))
    const connections: Connection[] = (d.links ?? []).map((l: Record<string, unknown>) => ({
      source: String(l.source ?? ''),
      target: String(l.target ?? ''),
      type:   ((l.type as string) || 'colleague') as Connection['type'],
    }))
    console.log(`[Fallback] ✅ data.json: ${sages.length} sages, ${connections.length} connections`)
    return { sages, connections }
  } catch (e) {
    console.error('[Fallback] data.json failed:', e)
    return { sages: [], connections: [] }
  }
}
```

## FILE: lib/types.ts

_(174 lines)_

```ts
export type Period =
  | 'patriarchs'
  | 'exodus'
  | 'judges'
  | 'kings'
  | 'second-temple'
  | 'tannaim'
  | 'amoraim'
  | 'geonim'
  | 'rishonim'
  | 'acharonim'
  | 'modern'

/** Canonical chronological order — single source for era lists across views. */
export const ALL_PERIODS: Period[] = [
  'patriarchs', 'exodus', 'judges', 'kings',
  'second-temple', 'tannaim', 'amoraim',
  'geonim', 'rishonim', 'acharonim', 'modern',
]

export type Region =
  | 'ashkenaz'
  | 'east-europe'
  | 'tsarfat'
  | 'provence'
  | 'sefarad'
  | 'italy'
  | 'north-africa'
  | 'mizrach'
  | 'eretz-israel'
  | 'other'

export type ConnectionType =
  | 'student'
  | 'teacher'
  | 'colleague'
  | 'influence'
  | 'oppose'
  | 'predecessor'
  | 'contemporary'
  | 'family'

export type Locale = 'he' | 'en' | 'ru'

export type Tab = 'graph' | 'map' | 'traditions' | 'ideas' | 'timeline' | 'genealogy' | 'about'

export interface MigrationPath {
  from: string
  to: string
  intermediate?: string[]
  years?: string
}

export interface Sage {
  id: string
  label: string
  name_en?: string
  period: Period
  region?: Region
  location?: string
  field?: string
  bio?: string
  core_concept?: string
  birth_year?: number
  death_year?: number
  tags?: string[]
  migration_path?: MigrationPath
  coordinates?: { lat: number; lng: number }
  spotify_url?: string
  works?: string[]
}

export interface Connection {
  source: string
  target: string
  type: ConnectionType
  source_name?: string
  target_name?: string
}

export interface GraphData {
  nodes: Sage[]
  links: Connection[]
}

export interface ResearchContent {
  sage_id: string
  content: string
  source_file?: string
  created_at: string
}

export interface Filters {
  period: Period[]
  region: Region[]
  field: string[]
  searchQuery: string
}

export const ERA_LABELS: Record<Period, Record<Locale, string>> = {
  patriarchs:      { he: 'האבות',           en: 'Patriarchs',    ru: 'Праотцы'        },
  exodus:          { he: 'יציאת מצרים',    en: 'Exodus & Sinai', ru: 'Исход и Синай' },
  judges:          { he: 'השופטים',         en: 'Judges',        ru: 'Судьи'          },
  kings:           { he: 'המלכים',          en: 'Kings',         ru: 'Цари'           },
  'second-temple': { he: 'בית שני',        en: 'Second Temple', ru: 'Второй Храм'    },
  tannaim:         { he: 'תנאים',           en: 'Tannaim',       ru: 'Таннаи'         },
  amoraim:         { he: 'אמוראים',         en: 'Amoraim',       ru: 'Амораи'         },
  geonim:          { he: 'גאונים',          en: 'Geonim',        ru: 'Гаоны'          },
  rishonim:        { he: 'ראשונים',         en: 'Rishonim',      ru: 'Ришоним'        },
  acharonim:       { he: 'אחרונים',         en: 'Acharonim',     ru: 'Ахароним'       },
  modern:          { he: 'מודרני',          en: 'Modern',        ru: 'Современность'  },
}

export const CONNECTION_LABELS: Record<ConnectionType, Record<Locale, string>> = {
  student:      { he: 'תלמיד',   en: 'Student',       ru: 'Ученик'          },
  teacher:      { he: 'רב',      en: 'Teacher',        ru: 'Учитель'         },
  colleague:    { he: 'חבר',     en: 'Colleague',      ru: 'Коллега'         },
  influence:    { he: 'השפעה',   en: 'Influence',      ru: 'Влияние'         },
  oppose:       { he: 'פולמוס',  en: 'Opponent',       ru: 'Оппонент'        },
  predecessor:  { he: 'קודם',    en: 'Predecessor',    ru: 'Предшественник'  },
  contemporary: { he: 'בן דור',  en: 'Contemporary',   ru: 'Современник'     },
  family:       { he: 'משפחה',   en: 'Family',         ru: 'Семья'           },
}

export const ERA_COLORS: Record<Period, string> = {
  patriarchs:      '#8d6e63',
  exodus:          '#ad1457',
  judges:          '#00838f',
  kings:           '#455a64',
  'second-temple': '#8e44ad',
  tannaim:         '#e74c3c',
  amoraim:         '#e67e22',
  geonim:          '#f1c40f',
  rishonim:        '#27ae60',
  acharonim:       '#2980b9',
  modern:          '#1abc9c',
}

export const REGION_LABELS: Record<Region, Record<Locale, string>> = {
  'ashkenaz':    { he: 'אשכנז',        en: 'Ashkenaz',       ru: 'Ашкеназ'          },
  'east-europe': { he: 'מזרח אירופה',  en: 'Eastern Europe', ru: 'Восточная Европа' },
  'tsarfat':     { he: 'צרפת',         en: 'France',         ru: 'Франция'          },
  'provence':    { he: 'פרובנס',       en: 'Provence',       ru: 'Прованс'          },
  'sefarad':     { he: 'ספרד',         en: 'Sepharad',       ru: 'Сефарад'          },
  'italy':       { he: 'איטליה',       en: 'Italy',          ru: 'Италия'           },
  'north-africa':{ he: 'צפון אפריקה', en: 'North Africa',   ru: 'Северная Африка'  },
  'mizrach':     { he: 'המזרח',        en: 'Middle East',    ru: 'Ближний Восток'   },
  'eretz-israel':{ he: 'ארץ ישראל',   en: 'Eretz Israel',   ru: 'Земля Израиля'    },
  'other':       { he: 'אחר',          en: 'Other',          ru: 'Другое'           },
}

export const REGION_COLORS: Record<Region, string> = {
  'ashkenaz':    '#43a047',
  'east-europe': '#c0ca33',
  'tsarfat':     '#ec407a',
  'provence':    '#f9a825',
  'sefarad':     '#1e88e5',
  'italy':       '#26c6da',
  'north-africa':'#8e24aa',
  'mizrach':     '#ef6c00',
  'eretz-israel':'#00897b',
  'other':       '#90a4ae',
}

export const TAB_META: Record<Tab, { labelHe: string; labelEn: string; labelRu: string; icon: string }> = {
  graph:      { labelHe: 'רשת קשרים',      labelEn: 'Network',    labelRu: 'Сеть связей', icon: '⬡' },
  map:        { labelHe: 'גיאוגרפיה',      labelEn: 'Geography',  labelRu: 'География',   icon: '◎' },
  traditions: { labelHe: 'מסורות',         labelEn: 'Traditions', labelRu: 'Традиции',    icon: '◈' },
  ideas:      { labelHe: 'טבלה',           labelEn: 'Table',      labelRu: 'Таблица',     icon: '≡' },
  timeline:   { labelHe: 'שלשלת הקבלה',  labelEn: 'Timeline',   labelRu: 'Хронология',  icon: '▷' },
  genealogy:  { labelHe: 'עץ שושלות',     labelEn: 'Lineage',    labelRu: 'Династии',    icon: '⟁' },
  about:      { labelHe: 'אודות',          labelEn: 'About',      labelRu: 'О проекте',   icon: 'temple' },
}
```

## FILE: lib/utils.ts

_(24 lines)_

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatYearRange(birth?: number, death?: number): string {
  if (!birth && !death) return ''
  if (birth && death) return `${birth}–${death}`
  if (birth) return `נ. ${birth}`
  if (death) return `נפ. ${death}`
  return ''
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .trim()
}
```

## FILE: lib/workers/d3-force-worker.ts

_(115 lines)_

```ts
// @ts-nocheck
// Web Worker: Offload D3 force simulation to prevent main-thread blocking
// Runs force simulation in background, emits position updates every 50ms

import * as d3 from 'd3'

interface NodeData extends d3.SimulationNodeDatum {
  id: string
  label: string
  group?: string
  [key: string]: any
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  type?: string
  [key: string]: any
}

interface MessageData {
  type: 'start' | 'stop'
  nodes?: NodeData[]
  links?: LinkData[]
  width?: number
  height?: number
  iterations?: number
}

let simulation: d3.Simulation<NodeData, LinkData> | null = null
let animationFrameId: number | null = null
let tickCount = 0
let maxIterations = 200

const postUpdate = (nodes: NodeData[]) => {
  self.postMessage({
    type: 'positions',
    nodes: nodes.map(d => ({
      id: d.id,
      x: d.x,
      y: d.y,
      vx: d.vx,
      vy: d.vy
    }))
  })
}

self.onmessage = (event: MessageEvent<MessageData>) => {
  const { type, nodes: rawNodes, links: rawLinks, width = 800, height = 600, iterations = 200 } = event.data

  if (type === 'start' && rawNodes && rawLinks) {
    maxIterations = iterations
    tickCount = 0

    // Reset animation loop
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }

    // Clone data (worker doesn't share references)
    const nodes: NodeData[] = rawNodes.map(d => ({ ...d }))
    const links: LinkData[] = rawLinks.map(d => ({
      source: typeof d.source === 'string' ? d.source : d.source.id,
      target: typeof d.target === 'string' ? d.target : d.target.id,
      type: d.type
    }))

    // Create D3 simulation
    simulation = d3
      .forceSimulation<NodeData, LinkData>(nodes)
      .force(
        'link',
        d3
          .forceLink<NodeData, LinkData>(links as d3.SimulationLinkDatum<NodeData>[])
          .id((d: NodeData) => d.id)
          .distance(80)
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .on('tick', () => {
        tickCount++

        // Send updates every 50ms (20fps is enough for visual update)
        if (tickCount % 3 === 0) {
          postUpdate(nodes)
        }

        // Stop after max iterations
        if (tickCount >= maxIterations) {
          if (simulation) {
            simulation.stop()
          }
          postUpdate(nodes) // Send final positions
          self.postMessage({ type: 'done' })
        }
      })
      .stop() // Start paused

    // Run simulation
    for (let i = 0; i < 20; i++) {
      simulation.tick()
    }

    simulation.restart()
  } else if (type === 'stop') {
    if (simulation) {
      simulation.stop()
    }
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
    self.postMessage({ type: 'stopped' })
  }
}
```

## FILE: store/useAppStore.ts

_(213 lines)_

```ts
'use client'

import { create } from 'zustand'
import type { Sage, Connection, Tab, Filters, Period, Region } from '@/lib/types'
import { regionsOf } from '@/lib/regions'
import { normalizeHe, fuzzyIncludes } from '@/lib/search'

interface AppState {
  // Data
  sages: Sage[]
  connections: Connection[]
  sageMap: Map<string, Sage>
  isLoaded: boolean
  totalSages: number
  lastUpdate: string

  // Selection
  selectedSageId: string | null
  selectedSage: Sage | null

  // UI
  theme: 'dark' | 'light'
  activeTab: Tab
  isDrawerOpen: boolean
  isSearchOpen: boolean
  isFiltersOpen: boolean
  isComparatorOpen: boolean
  comparatorSages: [Sage | null, Sage | null]

  // Filters
  filters: Filters
  filteredSages: Sage[]
  availableFields: string[]

  // Actions
  setData: (sages: Sage[], connections: Connection[], total: number, lastUpdate: string) => void
  selectSage: (sage: Sage) => void
  clearSelection: () => void
  setActiveTab: (tab: Tab) => void
  toggleTheme: () => void
  initTheme: () => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleSearch: () => void
  openFilters: () => void
  closeFilters: () => void
  openComparator: (sage?: Sage) => void
  closeComparator: () => void
  setComparatorSage: (slot: 0 | 1, sage: Sage | null) => void
  setSearchQuery: (query: string) => void
  togglePeriodFilter: (period: Period) => void
  toggleRegionFilter: (region: Region) => void
  toggleFieldFilter: (field: string) => void
  clearFilters: () => void
}

function applyFilters(sages: Sage[], filters: Filters): Sage[] {
  return sages.filter(sage => {
    if (filters.period.length > 0 && !filters.period.includes(sage.period)) return false
    if (filters.region.length > 0) {
      const sageRegions = sage.region ? [sage.region, ...regionsOf(sage.location)] : regionsOf(sage.location)
      if (!sageRegions.some(r => filters.region.includes(r))) return false
    }
    if (filters.field.length > 0) {
      if (!sage.field) return false
      // Handle comma-separated fields: "philosophy, halakha" → ["philosophy", "halakha"]
      const sageFields = sage.field.split(',').map(f => f.trim())
      if (!sageFields.some(f => filters.field.includes(f))) return false
    }
    if (filters.searchQuery) {
      // Fuzzy Hebrew matching: "רמבם" ↔ "רמב״ם" (nikud/quotes/finals-insensitive)
      const q = normalizeHe(filters.searchQuery)
      const matchLabel   = fuzzyIncludes(sage.label, q)
      const matchNameEn  = fuzzyIncludes(sage.name_en, q)
      const matchField   = fuzzyIncludes(sage.field, q)
      const matchLoc     = fuzzyIncludes(sage.location, q)
      if (!matchLabel && !matchNameEn && !matchField && !matchLoc) return false
    }
    return true
  })
}

export const useAppStore = create<AppState>((set, get) => ({
  sages: [],
  connections: [],
  sageMap: new Map(),
  isLoaded: false,
  totalSages: 0,
  lastUpdate: '',

  selectedSageId: null,
  selectedSage: null,

  theme: 'dark',
  activeTab: 'graph',
  isDrawerOpen: false,
  isSearchOpen: false,
  isFiltersOpen: false,
  isComparatorOpen: false,
  comparatorSages: [null, null],

  filters: {
    period: [],
    region: [],
    field: [],
    searchQuery: '',
  },
  filteredSages: [],
  availableFields: [],

  setData: (sages, connections, total, lastUpdate) => {
    const sageMap = new Map(sages.map(s => [s.id, s]))
    const fields = [...new Set(sages.map(s => s.field).filter(Boolean) as string[])].sort()
    set({
      sages,
      connections,
      sageMap,
      isLoaded: true,
      totalSages: total,
      lastUpdate,
      filteredSages: sages,
      availableFields: fields,
    })
  },

  selectSage: (sage) => {
    set({ selectedSage: sage, selectedSageId: sage.id, isDrawerOpen: true })
  },

  clearSelection: () => {
    set({ selectedSage: null, selectedSageId: null, isDrawerOpen: false })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
      try { localStorage.setItem('ozar-theme', theme) } catch { /* noop */ }
    }
    set({ theme })
  },
  initTheme: () => {
    if (typeof document === 'undefined') return
    let theme: 'dark' | 'light' = 'dark'
    try { if (localStorage.getItem('ozar-theme') === 'light') theme = 'light' } catch { /* noop */ }
    document.documentElement.dataset.theme = theme
    set({ theme })
  },

  openDrawer:  () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedSage: null, selectedSageId: null }),

  toggleSearch:  () => set(s => ({ isSearchOpen: !s.isSearchOpen })),
  openFilters:   () => set({ isFiltersOpen: true }),
  closeFilters:  () => set({ isFiltersOpen: false }),

  openComparator: (sage) => {
    const current = get().comparatorSages
    const next: [Sage | null, Sage | null] = sage
      ? [sage, current[1]]
      : current
    set({ isComparatorOpen: true, comparatorSages: next })
  },
  closeComparator: () => set({ isComparatorOpen: false }),
  setComparatorSage: (slot, sage) => {
    const current = get().comparatorSages
    const next: [Sage | null, Sage | null] = [...current] as [Sage | null, Sage | null]
    next[slot] = sage
    set({ comparatorSages: next })
  },

  setSearchQuery: (query) => {
    const { sages, filters } = get()
    const updated = { ...filters, searchQuery: query }
    set({ filters: updated, filteredSages: applyFilters(sages, updated) })
  },

  togglePeriodFilter: (period) => {
    const { sages, filters } = get()
    const updated = filters.period.includes(period)
      ? filters.period.filter(p => p !== period)
      : [...filters.period, period]
    const newFilters = { ...filters, period: updated }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  toggleRegionFilter: (region) => {
    const { sages, filters } = get()
    const updated = filters.region.includes(region)
      ? filters.region.filter(r => r !== region)
      : [...filters.region, region]
    const newFilters = { ...filters, region: updated }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  toggleFieldFilter: (field) => {
    const { sages, filters } = get()
    const updated = filters.field.includes(field)
      ? filters.field.filter(f => f !== field)
      : [...filters.field, field]
    const newFilters = { ...filters, field: updated }
    set({ filters: newFilters, filteredSages: applyFilters(sages, newFilters) })
  },

  clearFilters: () => {
    const { sages } = get()
    const empty: Filters = { period: [], region: [], field: [], searchQuery: '' }
    set({ filters: empty, filteredSages: sages })
  },
}))
```

