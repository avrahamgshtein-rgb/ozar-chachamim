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
