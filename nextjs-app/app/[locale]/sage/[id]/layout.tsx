import { notFound } from 'next/navigation'
import { getSageById } from '@/lib/serverData'

// Unknown ids must answer 404. The page's loading.tsx puts the page inside a
// Suspense boundary, so by the time page.tsx calls notFound() the 200 shell
// has already streamed. A layout renders outside that boundary, before any
// byte is sent, so the check lives here.
export default async function SageLayout({
  children, params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; id: string }>
}) {
  const { id } = await params
  if (!getSageById(id)) notFound()
  return children
}
