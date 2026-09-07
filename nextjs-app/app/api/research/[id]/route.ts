import { type NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { isValidLocale, LOCALES } from '@/lib/i18n'

interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

export const runtime = 'nodejs'
export const revalidate = 86400 // Cache for 24 hours

// Load valid sage IDs from data.json at build time (cached by Next.js)
async function getValidSageIds(): Promise<Set<string>> {
  try {
    const dataPath = join(process.cwd(), 'public', 'data.json')
    const content = await readFile(dataPath, 'utf-8')
    const data = JSON.parse(content)
    return new Set((data.nodes ?? []).map((node: { id: string }) => node.id))
  } catch (error) {
    console.error('[api/research] Failed to load data.json for validation:', error)
    return new Set()
  }
}

// Singleton cache (persists across requests in Node runtime)
let cachedSageIds: Set<string> | null = null

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const localeParam = request.nextUrl.searchParams.get('locale')

  // Validate locale parameter
  const locale = localeParam && isValidLocale(localeParam) ? localeParam : 'he'

  // Validate sage ID against dataset (prevent arbitrary path traversal)
  if (!cachedSageIds) {
    cachedSageIds = await getValidSageIds()
  }
  if (!cachedSageIds.has(id)) {
    return NextResponse.json(
      { error: 'Research document not found', docs: [] },
      { status: 404 }
    )
  }

  // Ensure ID contains only safe characters (UUID, numeric, or lowercase alphanumeric)
  if (!/^[a-z0-9_-]+$/i.test(id)) {
    return NextResponse.json(
      { error: 'Invalid research ID format', docs: [] },
      { status: 400 }
    )
  }

  try {
    const baseDir = resolve(process.cwd(), 'public', 'research')

    // Try locale-specific first (if not Hebrew)
    if (locale !== 'he') {
      try {
        const localePath = resolve(baseDir, `${id}.${locale}.json`)
        // Ensure resolved path is within research directory (prevent directory traversal)
        if (!localePath.startsWith(baseDir + require('path').sep) && localePath !== baseDir) {
          throw new Error('Path traversal attempt detected')
        }
        const content = await readFile(localePath, 'utf-8')
        return NextResponse.json(JSON.parse(content), {
          headers: { 'Cache-Control': 'public, max-age=86400' }
        })
      } catch {
        // Fall through to Hebrew
      }
    }

    // Fall back to Hebrew
    const hebrewPath = resolve(baseDir, `${id}.json`)
    // Ensure resolved path is within research directory (prevent directory traversal)
    if (!hebrewPath.startsWith(baseDir + require('path').sep) && hebrewPath !== baseDir) {
      throw new Error('Path traversal attempt detected')
    }
    const content = await readFile(hebrewPath, 'utf-8')
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
