/**
 * The redirects from the project's old production address(es) to the site's own domain (next.config.ts
 * `redirects()`). Pure and relative-import only, so the config and a test can both load it.
 *
 * One rule per legacy host: the same path and query string on SITE_URL, permanent (308), so the
 * `utm_*` tags of description lines already pasted survive. The rule matches the exact host only.
 */
import { LEGACY_HOSTS, SITE_URL } from './siteUrl'

export interface LegacyRedirect {
  source: string
  has: Array<{ type: 'host'; value: string }>
  destination: string
  permanent: true
}

/** The host (with any port) of an address, lower-cased; '' when it is not an address. */
function hostOf(address: string): string {
  try { return new URL(address).host.toLowerCase() } catch { return '' }
}

/**
 * `siteUrl` and `legacyHosts` default to the real ones; a test passes its own. A legacy host that is the
 * site's own host (NEXT_PUBLIC_SITE_URL set back to the old address) gets no rule: it would redirect to itself.
 */
export function legacyRedirects(siteUrl: string = SITE_URL, legacyHosts: readonly string[] = LEGACY_HOSTS): LegacyRedirect[] {
  const own = hostOf(siteUrl)
  return legacyHosts
    .map(h => h.trim().toLowerCase())
    .filter(h => h && h !== own)
    .map(host => ({
      source: '/:path*',
      // Next matches a host rule as a regular expression, anchored: the dots are escaped so that only this host matches
      has: [{ type: 'host' as const, value: host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }],
      destination: `${siteUrl.replace(/\/+$/, '')}/:path*`,
      permanent: true as const,
    }))
}
