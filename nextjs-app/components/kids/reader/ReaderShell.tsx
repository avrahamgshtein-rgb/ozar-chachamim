// The frame of every page of the children's books' reader (app/[locale]/kids/read): the site's slim top
// bar, the Hebrew `main`, the note on the English and Russian addresses, and the metadata all three pages
// share. Server-side only in practice (no hooks), but it holds nothing a client file needs: the client
// components of this folder take what they need as props.
import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import type { Locale } from '@/lib/types'
import { OG_LOCALES, UI } from '@/lib/i18n'
import { SITE_URL } from '@/lib/siteUrl'
import { readerCanonical, readerRobots } from '@/lib/kidsBookLinks'
import { FONT_KEY, FONT_STEPS } from '@/lib/kidsReading'
import { SiteTopBar } from '@/components/layout/SiteTopBar'

/** The English and Russian addresses show the Hebrew page, as /en/kids and /ru/kids do. */
export const READER_NOTE: Partial<Record<Locale, string>> = {
  en: 'The children’s books are read here in Hebrew, as they were written.',
  ru: 'Детские книги читаются здесь на иврите, как они и написаны.',
}

/** The id of the element that holds a part's text: the read-aloud player looks its pieces up inside it. */
export const READER_TEXT_ID = 'book-text'

export function ReaderShell({ locale, path, children }: { locale: Locale; path: string; children: ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto scroll-smooth bg-ink-900 text-ink-100">
      <SiteTopBar locale={locale} path={path} />
      <main id="main" lang="he" dir="rtl" className="mx-auto max-w-3xl px-4 pb-24 pt-6 font-sans sm:px-6 md:pt-10">
        {READER_NOTE[locale] && (
          <p lang={locale} dir="ltr" className="mb-6 rounded-lg border border-ink-700/40 bg-ink-800/40 px-3 py-2 text-sm text-ink-300">{READER_NOTE[locale]}</p>
        )}
        {children}
      </main>
    </div>
  )
}

/**
 * The metadata of a reader page. `pathAfterRead` is the address after /he/kids/read ('' , '/saltiel',
 * '/saltiel/meeting-1'). Every reader page is `noindex, follow` and canonical to its Hebrew address while
 * KIDS_BOOKS_INDEXED (lib/kidsBookLinks.ts) is false; the English and Russian addresses always are.
 */
export function readerMetadata(opts: {
  locale: string
  pathAfterRead: string
  title: string
  description: string
  image?: { src: string; w: number; h: number; alt: string }
}): Metadata {
  const { locale, pathAfterRead, title, description, image } = opts
  const loc = (locale === 'en' || locale === 'ru' ? locale : 'he') as Locale
  return {
    title,
    description,
    alternates: { canonical: readerCanonical(pathAfterRead) },
    robots: readerRobots(locale),
    openGraph: {
      type: 'website',
      siteName: UI[loc].appTitle,
      locale: OG_LOCALES.he,
      title,
      description,
      url: readerCanonical(pathAfterRead),
      ...(image ? { images: [{ url: `${SITE_URL}${image.src}`, width: image.w, height: image.h, alt: image.alt }] } : {}),
    },
  }
}

/**
 * Runs in the page before the text is parsed, so a reader who chose another text size never sees the page
 * in the default one first. It sets the same CSS variable the A−/A+ buttons set (--read-px, on <html>), from
 * the same stored value lib/kidsReading.ts::parseFontStep reads (a step of the scale as digits; anything
 * else leaves the default, which the text's own CSS falls back to). tests/kidsBooksReader.test.ts runs it
 * against parseFontStep.
 */
export function fontInitScript(): string {
  return (
    `try{var v=localStorage.getItem(${JSON.stringify(FONT_KEY)});` +
    `if(v!==null){v=v.trim();var s=${JSON.stringify(FONT_STEPS)};` +
    `if(/^\\d+$/.test(v)&&Number(v)<s.length)document.documentElement.style.setProperty('--read-px',s[Number(v)]+'px')}}catch(e){}`
  )
}

export function FontInit() {
  return <script dangerouslySetInnerHTML={{ __html: fontInitScript() }} />
}
