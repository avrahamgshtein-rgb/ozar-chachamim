import { NotFoundView } from '@/components/layout/NotFoundView'

// Rendered inside app/[locale]/layout.tsx, so <html lang dir> is already the
// reader's locale. Reached by notFound() anywhere under /[locale] (an unknown
// sage id, for one) and by unmatched paths via [...rest]/page.tsx.
export default function LocaleNotFound() {
  return <NotFoundView />
}
