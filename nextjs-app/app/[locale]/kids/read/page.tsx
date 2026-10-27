import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { KIDS_PATH, KIDS_ROUTES } from '@/lib/kidsJourney'
import { readBookHref } from '@/lib/kidsBookLinks'
import { bookMarks } from '@/lib/kidsBookTypes'
import { allBooks } from '@/lib/kidsBooks'
import { ReaderShell, readerMetadata } from '@/components/kids/reader/ReaderShell'

// "לקרוא יחד": the owner's two children's books, to be read on the site by a parent and a child together.
// Saltiel's book is here; Shira's is "coming soon" until the owner's file for it is built. Hebrew only, like
// the books: the English and Russian addresses show the same page with a note. Not for search engines yet
// (lib/kidsBookLinks.ts::KIDS_BOOKS_INDEXED).

interface PageProps {
  params: Promise<{ locale: string }>
}

const TITLE = 'לקרוא יחד: ספרי המסע לילדים'
const DESCRIPTION = 'הורים וילדים קוראים יחד את הספרים ״היכן החכמה מתגוררת״ של אברהם גולדשטיין: שאלתי והמגיד, ושירה והמספרת. לילדים בגילאי 9–12.'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const cover = allBooks()[0]?.cover
  return readerMetadata({ locale, pathAfterRead: '', title: TITLE, description: DESCRIPTION, image: cover })
}

export default async function KidsReadPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const books = allBooks()
  const rights = bookMarks(books[0]?.credit.rights ?? '© כל הזכויות שמורות למשפחת גולדשטיין')

  return (
    <ReaderShell locale={locale as Locale} path="/kids/read">
      <header>
        <p className="text-sm font-semibold text-gold-400">מסע לילדים · לגילאי 9–12</p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink-50 md:text-5xl">לקרוא יחד</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-200">
          הספרים של ״היכן החכמה מתגוררת״, לקריאה משותפת של הורים וילדים: פרק אחרי פרק, בקול, בקצב שלכם.
          אפשר להגדיל את האותיות, להשמיע את הטקסט בקול (במכשירים שיש בהם קול בעברית), ולהמשיך בפעם הבאה מהמקום שבו עצרתם.
        </p>
      </header>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {KIDS_ROUTES.map(route => {
          const book = books.find(b => b.book === route.key)
          return (
            <li key={route.key} className="flex">
              {book ? (
                <Link href={readBookHref(book.book)}
                  className="group flex w-full flex-col overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-800/30 transition-colors hover:border-gold-500/60">
                  <img src={book.cover.src} width={book.cover.w} height={book.cover.h} alt={bookMarks(book.cover.alt)}
                    className="h-auto w-full" />
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-semibold text-gold-400">{route.title}</span>
                    <span className="mt-1 font-serif text-2xl font-bold leading-snug text-ink-50">{bookMarks(book.title)}</span>
                    <span className="font-serif text-lg text-gold-300">{bookMarks(book.subtitle)}</span>
                    <span className="mt-3 text-sm leading-relaxed text-ink-300">
                      מאת {bookMarks(book.credit.author)}, עם איורים של בנו {bookMarks(book.credit.illustrator)}
                    </span>
                    <span className="mt-4 inline-flex min-h-[44px] items-center gap-2 self-start rounded-xl border border-gold-400 bg-gold-500 px-5 font-semibold text-ink-900 transition-colors group-hover:bg-gold-400">
                      <span aria-hidden>📖</span>
                      <span>לקרוא יחד</span>
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-dashed border-ink-700/60 bg-ink-800/20">
                  <img src={route.cover.src} width={route.cover.width} height={route.cover.height} alt={`כריכת הספר ״${route.book}״`} loading="lazy" decoding="async"
                    className="h-auto w-full opacity-70" />
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-semibold text-gold-400">{route.title}</span>
                    <span className="mt-1 font-serif text-2xl font-bold leading-snug text-ink-50">{route.book}</span>
                    <span className="font-serif text-lg text-gold-300">{route.subtitle}</span>
                    <span className="mt-4 inline-flex min-h-[44px] items-center self-start rounded-xl border border-ink-600/60 px-5 font-semibold text-ink-300">בקרוב</span>
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* a plain link below: the kids' page holds every station and is not prefetched from here */}
      <p className="mt-10 text-sm text-ink-400">
        המסעות עצמם, עם כרטיסי המסע, המשחקים והחידונים, נמצאים ב<a href={KIDS_PATH} className="link-gold">דף המסע לילדים</a>.
      </p>
      <p className="mt-3 text-xs text-ink-500">{rights}</p>
    </ReaderShell>
  )
}
