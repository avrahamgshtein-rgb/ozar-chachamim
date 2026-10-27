import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { KIDS_ROUTES } from '@/lib/kidsJourney'
import { KIDS_READ_PATH, readBookHref } from '@/lib/kidsBookLinks'
import { bookMarks, type Part } from '@/lib/kidsBookTypes'
import { bookSpeechItems } from '@/lib/kidsBookSpeech'
import { bookStaticParams, getBook, getPart, neighbours, readingOrder, stationLinks } from '@/lib/kidsBooks'
import { BookBlocks } from '@/components/kids/reader/BookBlocks'
import { PartFooter } from '@/components/kids/reader/PartFooter'
import { ReaderToolbar } from '@/components/kids/reader/ReaderToolbar'
import { ReadingMemory } from '@/components/kids/reader/ReadingMemory'
import { FontInit, READER_TEXT_ID, ReaderShell, readerMetadata } from '@/components/kids/reader/ReaderShell'

// One part of a children's book, to be read by a parent and a child together: the book's own text in a calm,
// large serif column, with the text size, read-aloud and the way on. The page is built ahead of time for
// every part of every book (bookStaticParams) and is the same for every reader; the text size, the
// reader's place and the voice are all browser-side. Hebrew; the English and Russian addresses show the same
// page with a note. Not for search engines yet (lib/kidsBookLinks.ts::KIDS_BOOKS_INDEXED).

interface PageProps {
  params: Promise<{ locale: string; book: string; slug: string }>
}

export function generateStaticParams() {
  return bookStaticParams()
}

const labelOf = (p: Part) => bookMarks(p.kick ? `${p.kick}: ${p.title}` : p.title)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, book: bookSlug, slug } = await params
  const book = getBook(bookSlug)
  const part = book ? getPart(book, slug) : null
  if (!isValidLocale(locale) || !book || !part) return {}
  // the share preview is the part's own picture, else the book's cover
  const picture = part.blocks.find((b): b is Extract<typeof b, { t: 'img' }> => b.t === 'img')
  return readerMetadata({
    locale,
    pathAfterRead: `/${book.book}/${part.slug}`,
    title: labelOf(part),
    description: `מתוך הספר ״${bookMarks(book.title)}״: ${labelOf(part)}. לקריאה משותפת של הורים וילדים.`,
    image: picture && picture.variant === 'panel' ? picture : book.cover,
  })
}

export default async function KidsPartPage({ params }: PageProps) {
  const { locale, book: bookSlug, slug } = await params
  if (!isValidLocale(locale)) notFound()
  const book = getBook(bookSlug)
  if (!book) notFound()
  const part = getPart(book, slug)
  if (!part) notFound()

  const { prev, next } = neighbours(book, part.slug)
  const order = readingOrder(book)
  const at = order.findIndex(p => p.slug === part.slug)
  const route = KIDS_ROUTES.find(r => r.key === book.route)
  const station = stationLinks(book, part)
  const items = bookSpeechItems(part)
  const link = (p: Part | null) => (p ? { slug: p.slug, label: p.tocLabel ?? p.title } : null)

  return (
    <ReaderShell key={`${book.book}/${part.slug}`} locale={locale as Locale} path={`/kids/read/${book.book}/${part.slug}`}>
      <FontInit />
      <nav aria-label="נתיב" className="flex flex-wrap items-center gap-x-2 text-sm text-ink-400">
        <Link href={KIDS_READ_PATH} className="link-gold">לקרוא יחד</Link>
        <span aria-hidden>›</span>
        <Link href={readBookHref(book.book)} className="link-gold">{bookMarks(book.title)}: תוכן הספר</Link>
      </nav>

      {/* The one element the read-aloud player looks its pieces up in (data-speak), and the one that styles
          the piece being read (.speaking, set by the player): arbitrary variants, so no global CSS is needed. */}
      <div id={READER_TEXT_ID}
        className="[&_.speaking]:rounded-lg [&_.speaking]:bg-gold-500/15 [&_.speaking]:shadow-[0_0_0_0.35rem_rgb(var(--gold-500-rgb)/0.15)] [&_[data-speak]]:transition-[background-color,box-shadow] [&_[data-speak]]:duration-300">
        <header data-speak="title" className="mx-auto mt-6 max-w-[40rem] rounded-lg px-2 py-2 text-center">
          {part.kick && <p className="text-sm font-semibold text-gold-400">{bookMarks(part.kick)}</p>}
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-ink-50 md:text-4xl">{bookMarks(part.title)}</h1>
          {part.subtitle && <p className="mt-2 font-serif text-xl text-gold-300">{bookMarks(part.subtitle)}</p>}
        </header>

        <div className="mt-5 flex justify-center">
          <ReaderToolbar book={book.book} items={items} targetId={READER_TEXT_ID} />
        </div>

        <article lang="he" dir="rtl"
          className={`mx-auto mt-8 max-w-[30em] font-serif text-[length:var(--read-px,21px)] leading-[1.9] text-ink-100 ${part.slug === 'copyright' ? 'text-center' : ''}`}>
          <BookBlocks book={book.book} part={part} />
        </article>
      </div>

      <PartFooter
        book={book.book}
        prev={link(prev)}
        next={link(next)}
        station={station && route ? { stationTitle: station.stationTitle, card: station.card, tourHref: station.tourHref, routeTitle: route.title } : null}
        position={at >= 0 ? { at: at + 1, of: order.length } : null}
      />
      <ReadingMemory book={book.book} slug={part.slug} kind={part.kind} remember={part.nav} />
    </ReaderShell>
  )
}
