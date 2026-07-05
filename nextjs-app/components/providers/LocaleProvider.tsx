'use client'

import { useEffect } from 'react'
import { getDirection, getHtmlLang } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

interface LocaleProviderProps {
  locale: Locale
  children: React.ReactNode
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  useEffect(() => {
    const dir  = getDirection(locale)
    const lang = getHtmlLang(locale)
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }, [locale])

  return <>{children}</>
}
