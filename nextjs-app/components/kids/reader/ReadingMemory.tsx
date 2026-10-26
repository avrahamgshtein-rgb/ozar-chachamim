'use client'

// Opening a part of a book does two quiet things, and draws nothing: it remembers the part as the
// reader's place in this browser (localStorage `ozar-kids-reading`, so the contents page can offer
// "continue where you stopped"), and it counts the opening as one `kids_read` event (the book's slug and
// the kind of part, never a name). The copyright page is not a place to continue from.
import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics'
import { READING_KEY, parseReading, rememberPart } from '@/lib/kidsReading'

export function ReadingMemory({ book, slug, kind, remember }: { book: string; slug: string; kind: string; remember: boolean }) {
  const counted = useRef<string | null>(null)
  useEffect(() => {
    const id = `${book}/${slug}`
    if (counted.current !== id) {
      counted.current = id
      track('kids_read', { book, part_kind: kind })
    }
    if (!remember) return
    try {
      const mem = rememberPart(parseReading(localStorage.getItem(READING_KEY)), book, slug, Date.now())
      localStorage.setItem(READING_KEY, JSON.stringify(mem))
    } catch { /* storage blocked: the page works without a memory */ }
  }, [book, slug, kind, remember])
  return null
}
