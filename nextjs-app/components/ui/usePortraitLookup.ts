'use client'

// The portraits of the sages, for a client component that must not carry them in its own bundle.
// lib/portraits.ts bundles public/data-portraits.json (about 15 KB gzipped once the set is complete), so the
// search box, which is on every page the visitor opens, loads it with a dynamic import() the first time it has
// sages to list; until then, and wherever the import fails, it lists them without portraits.
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/types'

/** The module as the search box uses it: portraitOf, portraitCredit ... */
export type PortraitModule = typeof import('@/lib/portraits')

let pending: Promise<PortraitModule> | null = null

/** Loads lib/portraits.ts once; every later call gets the same promise. A failed load is tried again next time. */
export function loadPortraits(): Promise<PortraitModule> {
  if (!pending) {
    pending = import('@/lib/portraits').catch(err => {
      pending = null
      throw err
    })
  }
  return pending
}

/**
 * The portraits module once it has arrived, else null. Nothing is requested until `enabled` is true (the first time
 * the list of sages is shown), so a page where nobody searches never loads it.
 */
export function usePortraitLookup(enabled: boolean): PortraitModule | null {
  const [mod, setMod] = useState<PortraitModule | null>(null)
  useEffect(() => {
    if (!enabled || mod) return
    let alive = true
    loadPortraits().then(m => { if (alive) setMod(m) }).catch(() => { /* no portraits in the list, nothing else breaks */ })
    return () => { alive = false }
  }, [enabled, mod])
  return mod
}

/**
 * What a result row shows in place of the era dot: the small picture and its caption (as `title`). The picture is decorative
 * (`alt=""`): the sage's name is written beside it, and a screen reader should not say it twice.
 */
export interface SearchThumb {
  src: string
  title: string
  kind: 'illustration' | 'photo'
}

/** The thumbnail of a sage's result row, or null (the row keeps its era dot). Pure: the module is passed in. */
export function searchThumb(mod: PortraitModule | null, id: string, locale: Locale): SearchThumb | null {
  if (!mod) return null
  const portrait = mod.portraitOf(id)
  if (!portrait) return null
  return {
    src: portrait.srcSm,
    title: mod.portraitCredit(portrait, locale),
    kind: portrait.kind,
  }
}
