'use client'

// "Continue where you stopped", on a book's contents page: the part this browser opened last
// (localStorage `ozar-kids-reading`, written by ReadingMemory). Drawn only once the browser has said there
// is one, so the server page and a first-time reader see nothing; a stored part the book no longer has is
// ignored.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { READING_KEY, lastPartOf, parseReading } from '@/lib/kidsReading'

export interface ContinuePart { slug: string; label: string; href: string }

/** The part to continue from, out of the book's parts in reading order, given the stored value; null when there is none to offer. */
export function continueTarget(raw: unknown, book: string, parts: ContinuePart[]): ContinuePart | null {
  const slug = lastPartOf(parseReading(raw), book, parts.map(p => p.slug))
  return parts.find(p => p.slug === slug) ?? null
}

export function ContinueReading({ book, parts }: { book: string; parts: ContinuePart[] }) {
  const [target, setTarget] = useState<ContinuePart | null>(null)
  useEffect(() => {
    try { setTarget(continueTarget(localStorage.getItem(READING_KEY), book, parts)) } catch { /* storage blocked: nothing to offer */ }
  }, [book, parts])
  if (!target) return null
  return (
    <Link href={target.href}
      className="mt-6 flex items-center gap-3 rounded-2xl border border-gold-500/60 bg-gradient-to-b from-gold-500/25 to-gold-500/10 px-5 py-4 shadow-[0_0_24px_rgba(233,196,106,0.15)] transition-colors hover:from-gold-500/35">
      <span aria-hidden className="text-2xl">🔖</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-gold-300">להמשיך מהמקום שבו עצרתם</span>
        <span className="block truncate font-serif text-lg font-bold text-ink-50">{target.label}</span>
      </span>
      <span aria-hidden className="text-xl text-gold-300">←</span>
    </Link>
  )
}
