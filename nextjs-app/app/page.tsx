import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE } from '@/lib/i18n'

// Root → redirect to default locale
export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`)
}
