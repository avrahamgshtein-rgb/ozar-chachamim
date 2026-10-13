// The share card: the image WhatsApp, Telegram, Facebook and X show when a sage's page is shared.
// Drawn on request by next/og and cached by the CDN (the response is immutable), in the page's
// language: name, subtitle, era, years, what the page holds, and the site's medallion.
// Hebrew goes through lib/ogText, because Satori has no right-to-left layout of its own.
import { ImageResponse } from 'next/og'
import { getSageById } from '@/lib/serverData'
import { localizeSage } from '@/lib/serverDataTranslator'
import { labelParts } from '@/lib/displayName'
import { isValidLocale, UI } from '@/lib/i18n'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale } from '@/lib/types'
import { formatYearRangeFor } from '@/lib/utils'
import { hasQuiz } from '@/lib/quiz'
import { sageVideos } from '@/lib/youtube'
import { SITE_URL } from '@/lib/siteUrl'
import { clipWords } from '@/lib/ogText'
import { OG, OgLine, ogAssets } from '@/lib/ogCard'

export const alt = 'אוצר חכמים · Ozar Chachamim'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const FEATURES = {
  research: { he: 'מחקר מלא', en: 'Full research', ru: 'Полное исследование' },
  video: { he: 'סרטון', en: 'Video', ru: 'Видео' },
  quiz: { he: 'חידון', en: 'Quiz', ru: 'Викторина' },
  episode: { he: 'פרק להאזנה', en: 'Podcast episode', ru: 'Подкаст' },
} satisfies Record<string, Record<Locale, string>>

const { ink: INK, parchment: PARCHMENT, gold: GOLD, goldSoft: GOLD_SOFT, muted: MUTED } = OG
const Line = OgLine

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await Promise.resolve(params)
  const loc: Locale = isValidLocale(locale) ? (locale as Locale) : 'he'
  const rtl = loc === 'he'

  const { fonts, serif, sans, medallion: medallionSrc } = await ogAssets(loc)
  const host = SITE_URL.replace(/^https?:\/\//, '')

  const raw = getSageById(id)
  if (!raw) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: INK }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={medallionSrc} width={360} height={360} alt="" />
        </div>
      ),
      { ...size, fonts },
    )
  }

  const sage = localizeSage(raw, loc)
  const { name, tagline, fullName } = labelParts(sage.label)
  const subtitle = clipWords(tagline ?? fullName ?? '', 90)
  const era = ERA_LABELS[sage.period]?.[loc] ?? ''
  const years = formatYearRangeFor(loc, sage.birth_year, sage.death_year, sage.date_precision)
  const accent = ERA_COLORS[sage.period] ?? GOLD
  const features = [
    FEATURES.research[loc],
    sageVideos(raw.id, loc).length > 0 ? FEATURES.video[loc] : null,
    raw.spotify_url ? FEATURES.episode[loc] : null,
    hasQuiz(raw.id, loc) ? FEATURES.quiz[loc] : null,
  ].filter((x): x is string => Boolean(x))
  const nameSize = name.length <= 16 ? 92 : name.length <= 28 ? 76 : name.length <= 44 ? 62 : 52
  const meta = [era, years].filter(Boolean).join('  ·  ')
  const align = rtl ? 'end' : 'start'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex',
          flexDirection: rtl ? 'row-reverse' : 'row',
          background: INK,
          fontFamily: sans,
        }}
      >
        {/* The era's colour, as a band along the reading edge */}
        <div style={{ width: 14, height: '100%', background: accent, display: 'flex' }} />

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          alignItems: rtl ? 'flex-end' : 'flex-start', padding: '58px 64px 52px',
        }}>
          <Line text={UI[loc].appTitle} size={30} color={GOLD} font={serif} weight={700} align={align} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: rtl ? 'flex-end' : 'flex-start', maxWidth: 760 }}>
            <Line text={name} size={nameSize} color={PARCHMENT} font={serif} weight={700} align={align} />
            {subtitle && (
              <div style={{ display: 'flex', marginTop: 18 }}>
                <Line text={subtitle} size={34} color={GOLD_SOFT} font={serif} weight={700} align={align} />
              </div>
            )}
            {meta && (
              <div style={{
                display: 'flex', marginTop: 28, padding: '8px 22px', borderRadius: 999,
                border: `2px solid ${accent}`, background: 'rgba(255,255,255,0.04)',
              }}>
                <Line text={meta} size={28} color={PARCHMENT} font={sans} weight={500} align={align} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 14 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex', padding: '6px 16px', borderRadius: 10,
                background: 'rgba(201,151,58,0.14)', border: '1px solid rgba(201,151,58,0.35)',
              }}>
                <Line text={f} size={24} color={GOLD_SOFT} font={sans} weight={500} align={align} />
              </div>
            ))}
            <div style={{ display: 'flex', marginLeft: rtl ? 0 : 10, marginRight: rtl ? 10 : 0, fontSize: 22, color: MUTED, fontFamily: 'PT Sans' }}>
              {host}
            </div>
          </div>
        </div>

        <div style={{ width: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={medallionSrc} width={330} height={330} alt="" style={{ opacity: 0.95 }} />
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
