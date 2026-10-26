import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { KIDS_READ_PATH, readPartHref } from '@/lib/kidsBookLinks'
import { KIDS_PATH } from '@/lib/kidsJourney'
import { bookMarks } from '@/lib/kidsBookTypes'
import { allBooks, getBook, keysOf, readingOrder } from '@/lib/kidsBooks'
import { ContinueReading } from '@/components/kids/reader/ContinueReading'
import { ReaderShell, readerMetadata } from '@/components/kids/reader/ReaderShell'

// A book's contents: the word to the parents first, the keys of the journey, every part in the order of the
// book, and "continue where you stopped" for a browser that has been here. Hebrew; the English and Russian
// addresses show the same page with a note. Not for search engines yet (KIDS_BOOKS_INDEXED).

interface PageProps {
  params: Promise<{ locale: string; book: string }>
}

export function generateStaticParams() {
  return allBooks().map(b => ({ book: b.book }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, book: slug } = await params
  const book = getBook(slug)
  if (!isValidLocale(locale) || !book) return {}
  return readerMetadata({
    locale,
    pathAfterRead: `/${book.book}`,
    title: `לקרוא את ״${bookMarks(book.title)}״`,
    description: `${bookMarks(book.title)}: ${bookMarks(book.subtitle)}. ${bookMarks(book.kick)}, ${bookMarks(book.age)}. לקריאה משותפת של הורים וילדים.`,
    image: book.cover,
  })
}

export default async function KidsBookPage({ params }: PageProps) {
  const { locale, book: slug } = await params
  if (!isValidLocale(locale)) notFound()
  const book = getBook(slug)
  if (!book) notFound()

  const order = readingOrder(book)
  const parents = book.parts.find(p => p.slug === 'parents' && p.nav) ?? order[0]
  const copyright = book.parts.find(p => !p.nav)
  const keys = keysOf(book)

  return (
    <ReaderShell locale={locale as Locale} path={`/kids/read/${book.book}`}>
      <nav aria-label="נתיב" className="text-sm text-ink-400">
        <Link href={KIDS_READ_PATH} className="link-gold">לקרוא יחד</Link>
        <span aria-hidden className="mx-2">›</span>
        <span className="text-ink-200">{bookMarks(book.title)}</span>
      </nav>

      <header className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center">
        <div>
          <p className="text-sm font-semibold text-gold-400">{bookMarks(book.kick)} · {bookMarks(book.age)}</p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink-50 md:text-5xl">{bookMarks(book.title)}</h1>
          <p className="mt-2 font-serif text-xl text-gold-300">{bookMarks(book.subtitle)}</p>
          <p className="mt-4 leading-relaxed text-ink-300">
            מאת {bookMarks(book.credit.author)}, עם איורים של בנו {bookMarks(book.credit.illustrator)}
          </p>
        </div>
        <img src={book.cover.src} width={book.cover.w} height={book.cover.h} alt={bookMarks(book.cover.alt)}
          className="h-auto w-full rounded-2xl border border-ink-700/40 md:order-first" />
      </header>

      <ContinueReading book={book.book} parts={order.map(p => ({ slug: p.slug, label: bookMarks(p.tocLabel ?? p.title), href: readPartHref(book.book, p.slug) }))} />

      {parents && (
        <Link href={readPartHref(book.book, parents.slug)}
          className="mt-6 block rounded-2xl border border-gold-500/40 bg-gold-500/10 p-5 transition-colors hover:border-gold-500/70 hover:bg-gold-500/15">
          <span className="text-xs font-semibold text-gold-400">מתחילים כאן</span>
          <span className="mt-1 block font-serif text-2xl font-bold text-ink-50">{bookMarks(parents.subtitle ?? parents.title)}</span>
          <span className="mt-0.5 block text-ink-300">{bookMarks(parents.tocLabel ?? parents.title)}</span>
        </Link>
      )}

      {keys.length > 0 && (
        <section aria-labelledby="keys-h" className="mt-12">
          <h2 id="keys-h" className="font-serif text-2xl font-bold text-ink-50">המפתחות של המסע</h2>
          <ol className="mt-4 flex flex-wrap gap-2">
            {keys.map(k => (
              <li key={k.slug}>
                <Link href={readPartHref(book.book, k.slug)} prefetch={false} title={bookMarks(k.title)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 font-semibold text-gold-200 transition-colors hover:bg-gold-500/20">
                  <span aria-hidden>🔑</span>
                  <span>{bookMarks(k.name)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="toc-h" className="mt-12">
        <h2 id="toc-h" className="font-serif text-2xl font-bold text-ink-50">תוכן הספר</h2>
        <ol className="mt-4 divide-y divide-ink-700/40 overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-800/30">
          {order.map(p => (
            <li key={p.slug}>
              <Link href={readPartHref(book.book, p.slug)} prefetch={false}
                className="flex min-h-[3.25rem] items-center gap-4 px-4 py-3 transition-colors hover:bg-ink-800/70">
                {p.kind === 'meeting' && p.station ? (
                  <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-full border-2 border-gold-500 font-serif text-lg font-bold text-gold-300">{p.station}</span>
                ) : (
                  <span aria-hidden className="grid h-9 w-9 flex-none place-items-center text-gold-500/70">◆</span>
                )}
                <span className="min-w-0 flex-1 font-serif text-lg leading-snug text-ink-50">{bookMarks(p.tocLabel ?? p.title)}</span>
                <span aria-hidden className="text-gold-400">←</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-12 border-t border-ink-700/40 pt-6 text-sm text-ink-400">
        {copyright && (
          <p>
            <Link href={readPartHref(book.book, copyright.slug)} className="link-gold">פרטי הספר וזכויות היוצרים</Link>
          </p>
        )}
        <p className="mt-2 text-xs text-ink-500">{bookMarks(book.credit.rights)}</p>
        <p className="mt-4"><Link href={KIDS_READ_PATH} className="link-gold">חזרה לכל הספרים</Link> · <a href={KIDS_PATH} className="link-gold">דף המסע לילדים</a></p>
      </footer>
    </ReaderShell>
  )
}
