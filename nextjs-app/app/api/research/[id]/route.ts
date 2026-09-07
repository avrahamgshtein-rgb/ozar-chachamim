import { type NextRequest, NextResponse } from 'next/server'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { getSageById, getResearchDocs } from '@/lib/serverData'
import { isValidLocale } from '@/lib/i18n'

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache for 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const localeParam = request.nextUrl.searchParams.get('locale')

  // Validate locale parameter
  if (localeParam && !isValidLocale(localeParam)) {
    return NextResponse.json(
      { error: 'Invalid locale', docs: [] },
      { status: 400 }
    )
  }
  const locale = (localeParam as 'he' | 'en' | 'ru') || 'he'

  // Validate sage ID against complete dataset (canonical + supplemental)
  // Uses existing server data accessor to ensure consistency with other services
  const sage = getSageById(id)
  if (!sage) {
    return NextResponse.json(
      { error: 'Research document not found', docs: [] },
      { status: 404 }
    )
  }

  // Ensure ID contains only safe characters to prevent path traversal
  if (!/^[a-z0-9_-]+$/i.test(id)) {
    return NextResponse.json(
      { error: 'Invalid research ID format', docs: [] },
      { status: 400 }
    )
  }

  try {
    // Use existing server-side research loader (same as RAG uses)
    // Handles locale fallback and path safety internally
    const docs = await getResearchDocs(id, locale)
    return NextResponse.json(docs, {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  } catch (error) {
    console.error(`[api/research] Failed to load research for ${id}:`, error)
    return NextResponse.json(
      { error: 'Research document not found', docs: [] },
      { status: 404 }
    )
  }
}
