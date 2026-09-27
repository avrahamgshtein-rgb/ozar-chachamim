import { notFound } from 'next/navigation'

// Unmatched paths under a locale (/he/no-such-page) would otherwise fall
// through to the root 404, outside the locale layout. Catching them here sends
// them to app/[locale]/not-found.tsx, in the reader's language and direction.
export default function CatchAll() {
  notFound()
}
