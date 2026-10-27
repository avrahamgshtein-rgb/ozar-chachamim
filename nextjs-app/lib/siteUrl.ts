/**
 * Single source of truth for the site's canonical origin.
 *
 * Override with NEXT_PUBLIC_SITE_URL when deploying elsewhere. The default is
 * the owner's own domain (bought through Vercel on 2026-10-27, apex as the
 * primary; www redirects to it in the Vercel dashboard), attached to the
 * project this repo's GitHub Action deploys.
 *
 * Note: https://ozar-chachamim.vercel.app is a SEPARATE Vercel project serving a
 * different dataset. It is deliberately not referenced here and is not
 * redirected or retired by this project (the owner can redirect it in that
 * project's own Domains settings).
 */

const DEFAULT_SITE_URL = 'https://ozarchachamim.org'

/**
 * The address(es) this project was published under before the domain: every link, video and podcast
 * description shared up to 2026-10-27 carries it, so it must keep answering. next.config.ts redirects
 * each of these hosts to SITE_URL (lib/legacyRedirects.ts). Only the production host of THIS project:
 * Vercel's per-deployment and preview addresses are not listed and stay as they are.
 */
export const LEGACY_HOSTS: readonly string[] = ['ozar-chachamim-app.vercel.app']

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
