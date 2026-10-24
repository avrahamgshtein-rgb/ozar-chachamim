import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/siteMetadata'
import { getAllSages } from '@/lib/serverData'
import { sageIndexGroups } from '@/lib/sageIndex'
import { SAGE_INDEX_TEXT } from '@/lib/sageIndexText'
import { SageIndex } from '@/components/sages/SageIndex'
import { SiteTopBar } from '@/components/layout/SiteTopBar'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = SAGE_INDEX_TEXT[locale]
  return pageMetadata({ locale, path: '/sages', title: t.title, description: t.description(getAllSages().length) })
}

// The plain list of every sage, made at build time for the three languages: one ordinary link to each
// sage page, so that no page depends on the app's search to be found.
export default async function SagesIndexPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  return (
    // The page is its own scroller: body is overflow:hidden for the graph canvas.
    <div className="h-dvh overflow-y-auto bg-ink-900 text-ink-100">
      <SiteTopBar locale={locale} path="/sages" />
      <main id="main">
        <SageIndex locale={locale} groups={sageIndexGroups(locale)} />
      </main>
    </div>
  )
}
