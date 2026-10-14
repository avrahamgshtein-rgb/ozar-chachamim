import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import { UI } from '@/lib/i18n'
import { LocaleLinks } from './LocaleLinks'
import { SoundtrackToggle } from '@/components/ui/SoundtrackToggle'

/**
 * Slim top bar for the site's standalone pages (About, 404): the site title
 * back to the home page, a way back to the map, and the same page in the other
 * two languages. Visually it matches the sage page's sticky bar.
 */
export function SiteTopBar({ locale, path = '', followUrl = false }: {
  locale: Locale
  path?: string
  /** The language links follow the address as the page changes it (see LocaleLinks). */
  followUrl?: boolean
}) {
  const t = UI[locale]
  return (
    <header className="sticky top-0 z-20 glass border-b border-gold-500/10">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex min-w-0 flex-col rounded-md">
          <span className="font-serif text-lg font-bold leading-none text-gold-300">{t.appTitle}</span>
          <span className="mt-1 hidden truncate font-sans text-[11px] text-ink-400 sm:block">{t.appSubtitle}</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/${locale}`}
            className={cn(
              'hidden sm:inline-flex items-center rounded-xl px-3 py-1.5 min-h-[36px] font-sans text-xs',
              'glass-light border border-ink-600/40 text-ink-300 transition-colors hover:border-gold-500/30 hover:text-ink-100',
            )}
          >
            {t.backToMap}
          </Link>
          <SoundtrackToggle
            locale={locale}
            className="justify-center h-9 w-9 rounded-xl glass-light border border-ink-600/40 text-ink-300 transition-colors hover:border-gold-500/30 hover:text-ink-100"
          />
          <LocaleLinks locale={locale} path={path} follow={followUrl} />
        </div>
      </div>
    </header>
  )
}
