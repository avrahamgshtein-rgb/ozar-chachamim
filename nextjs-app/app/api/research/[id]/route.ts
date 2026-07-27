import { type NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache for 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const locale = request.nextUrl.searchParams.get('locale') || 'he'

  try {
    // Try locale-specific first
    if (locale !== 'he') {
      try {
        const path = join(process.cwd(), 'public', 'research', `${id}.${locale}.json`)
        const content = await readFile(path, 'utf-8')
        return NextResponse.json(JSON.parse(content), {
          headers: { 'Cache-Control': 'public, max-age=86400' }
        })
      } catch {
        // Fall through to Hebrew
      }
    }

    // Fall back to Hebrew
    const path = join(process.cwd(), 'public', 'research', `${id}.json`)
    const content = await readFile(path, 'utf-8')
    return NextResponse.json(JSON.parse(content), {
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
