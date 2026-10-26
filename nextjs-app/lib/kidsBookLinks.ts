// Where the owner's two children's books can be read on the site ("היכן החכמה מתגוררת": Saltiel's book now,
// Shira's when her file arrives), and the one switch that decides whether search engines may index them.
// Pure: the addresses, the availability and the robots rule, shared by the reader (app/[locale]/kids/read),
// the entry points (the kids' page, the time machine, About) and the sitemap.
import type { Metadata } from 'next'
import { SITE_URL } from './siteUrl'

export type BookRoute = 'saltiel' | 'shira'

/**
 * The ONE switch for search engines. While it is false every reader page is `noindex, follow` and none is in
 * the sitemap (the books are going to a publisher). Setting it to true makes the Hebrew reader pages
 * indexable and puts them in the sitemap; the English and Russian addresses stay noindex.
 */
export const KIDS_BOOKS_INDEXED = false

/** Where the reader lives. Hebrew only, like the books. */
export const KIDS_READ_PATH = '/he/kids/read'

/**
 * Which books have a reading edition on the site. A book is available when its JSON is in
 * content/kids-books/ (tests/kidsBooksLib.test.ts checks the two agree): Shira's flips to true when the
 * owner's file for her book has been built.
 */
export const KIDS_BOOKS_AVAILABLE: Record<BookRoute, boolean> = { saltiel: true, shira: false }

export const readBookHref = (book: string): string => `${KIDS_READ_PATH}/${book}`

export const readPartHref = (book: string, slug: string): string => `${KIDS_READ_PATH}/${book}/${slug}`

/** The slug of station `n` of a route: Saltiel's are "meetings", Shira's "stations". */
export const partSlugOf = (route: BookRoute, n: number): string => (route === 'saltiel' ? `meeting-${n}` : `station-${n}`)

/** The reader page of a station: /he/kids/read/saltiel/meeting-3. */
export const readStationHref = (route: BookRoute, n: number): string => readPartHref(route, partSlugOf(route, n))

/** The robots rule of every reader page. */
export function readerRobots(locale: string): Metadata['robots'] {
  return KIDS_BOOKS_INDEXED && locale === 'he' ? undefined : { index: false, follow: true }
}

/** The canonical address of a reader page, always the Hebrew one: `readerCanonical('')`, `readerCanonical('/saltiel/meeting-1')`. */
export const readerCanonical = (pathAfterRead: string): string => `${SITE_URL}${KIDS_READ_PATH}${pathAfterRead}`
