/**
 * Search-console ownership codes, for the `verification` field of the root
 * layout and of the locale layout.
 *
 * Google Search Console ("HTML tag" method) and Bing Webmaster Tools ("HTML
 * Meta Tag" method) each give a code to publish in a <meta> tag in the head of
 * the home page. Put the code in one of two places:
 *   - the environment (Vercel → Settings → Environment Variables, no code
 *     change): NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_BING_SITE_VERIFICATION, or
 *   - the two constants below.
 * The environment wins when it is set. A code that is empty produces no tag at
 * all (never an empty <meta>), so the site ships clean until the owner has one.
 *
 * Only the code itself goes here: for Google the value of `content=` in
 * `<meta name="google-site-verification" content="CODE" />`, for Bing the value
 * of `content=` in `<meta name="msvalidate.01" content="CODE" />`.
 */
import type { Metadata } from 'next'

const GOOGLE_CODE = ''
const BING_CODE = ''

/** Written out in full, not read through a variable: Next.js inlines `process.env.NEXT_PUBLIC_*` only in that form. */
export const GOOGLE_SITE_VERIFICATION: string = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || GOOGLE_CODE).trim()
export const BING_SITE_VERIFICATION: string = (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || BING_CODE).trim()

/**
 * The `verification` metadata for the given codes: `undefined` when both are
 * empty, and a key only for a code that is not (Google → `google-site-verification`,
 * Bing → `msvalidate.01`).
 */
export function verificationMetadata(
  google: string = GOOGLE_SITE_VERIFICATION,
  bing: string = BING_SITE_VERIFICATION,
): Metadata['verification'] | undefined {
  const g = google.trim()
  const b = bing.trim()
  if (!g && !b) return undefined
  return {
    ...(g ? { google: g } : {}),
    ...(b ? { other: { 'msvalidate.01': b } } : {}),
  }
}
