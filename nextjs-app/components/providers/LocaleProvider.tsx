import Script from 'next/script'
import { getDirection, getHtmlLang } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

interface LocaleProviderProps {
  locale: Locale
  children: React.ReactNode
}

/**
 * Corrects html[lang] / html[dir] for non-Hebrew locales.
 *
 * The root layout ships he/rtl because Hebrew is canonical and is the default
 * redirect target. For en/ru this runs before first paint (beforeInteractive),
 * rather than in an effect after hydration, so there is no visible flip from
 * RTL to LTR. The literal values are baked in at render time on the server.
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  const dir = getDirection(locale)
  const lang = getHtmlLang(locale)
  const needsCorrection = lang !== 'he' || dir !== 'rtl'

  return (
    <>
      {needsCorrection && (
        <Script id="locale-init" strategy="beforeInteractive">
          {`document.documentElement.lang=${JSON.stringify(lang)};document.documentElement.dir=${JSON.stringify(dir)};`}
        </Script>
      )}
      {children}
    </>
  )
}
