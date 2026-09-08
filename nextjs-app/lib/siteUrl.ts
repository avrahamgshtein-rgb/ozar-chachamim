/**
 * Single source of truth for the site's canonical origin.
 *
 * Override with NEXT_PUBLIC_SITE_URL when deploying elsewhere. The default is
 * the production deployment this project's GitHub Action publishes to, verified
 * as serving the current commit.
 *
 * Note: https://ozar-chachamim.vercel.app is a SEPARATE deployment serving a
 * different dataset. It is deliberately not referenced here and is not
 * redirected or retired by this project.
 */

const DEFAULT_SITE_URL = 'https://ozar-chachamim-app.vercel.app'

function normalise(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return DEFAULT_SITE_URL
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const SITE_URL: string = normalise(
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
)

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = '/'): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
