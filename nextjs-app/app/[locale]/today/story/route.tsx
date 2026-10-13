// The Today page's image for a WhatsApp status or a story (1080×1920): today's Hebrew date, the sage whose
// hillula it is (or the sage of the day), his era and years, one line about him, and the address.
// Rebuilt every half hour, so it changes with the day (midnight, Israel time).
import { ImageResponse } from 'next/og'
import { isValidLocale, UI } from '@/lib/i18n'
import { ERA_COLORS, ERA_LABELS, type Locale } from '@/lib/types'
import { localizeSage, translatedFields } from '@/lib/serverDataTranslator'
import { labelParts } from '@/lib/displayName'
import { formatYearRangeFor } from '@/lib/utils'
import { SITE_URL } from '@/lib/siteUrl'
import { clipWords } from '@/lib/ogText'
import { OG, OgLine, ogAssets } from '@/lib/ogCard'
import { formatHebrewDate } from '@/lib/today'
import { todayFeature } from '@/lib/todayServer'

export const revalidate = 1800

const S = {
  today: { he: 'היום באוצר חכמים', en: 'Today at Ozar Chachamim', ru: 'Сегодня в «Оцар Хахамим»' },
  hillula: { he: 'יום ההילולא של', en: 'The hillula of', ru: 'День памяти' },
  daily: { he: 'חכם היום', en: 'Sage of the day', ru: 'Мудрец дня' },
  more: { he: 'מחקר מלא · האזנה · סרטון · חידון', en: 'Full research · Listen · Video · Quiz', ru: 'Исследование · Аудио · Видео · Викторина' },
} satisfies Record<string, Record<Locale, string>>

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const loc: Locale = isValidLocale(locale) ? (locale as Locale) : 'he'
  const { fonts, serif, sans, medallion } = await ogAssets(loc)
  const t = todayFeature()
  const sage = localizeSage(t.featured, loc)
  const { name } = labelParts(sage.label)
  const era = ERA_LABELS[sage.period]?.[loc] ?? ''
  const years = formatYearRangeFor(loc, sage.birth_year, sage.death_year, sage.date_precision)
  const accent = ERA_COLORS[sage.period] ?? OG.gold
  const local = loc === 'he' || translatedFields(t.featured.id, loc).has('core_concept')
  const line = local ? clipWords(sage.core_concept || '', 150) : ''
  const host = `${SITE_URL.replace(/^https?:\/\//, '')}/${loc}/today`
  const nameSize = name.length <= 14 ? 120 : name.length <= 26 ? 100 : name.length <= 40 ? 84 : 70

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', background: OG.ink, padding: '120px 80px 110px', fontFamily: sans,
        borderTop: `18px solid ${accent}`, borderBottom: `18px solid ${accent}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={medallion} width={300} height={300} alt="" />
          <div style={{ display: 'flex', marginTop: 36 }}>
            <OgLine text={S.today[loc]} size={46} color={OG.gold} font={serif} weight={700} align="center" />
          </div>
          <div style={{ display: 'flex', marginTop: 18 }}>
            <OgLine text={formatHebrewDate(t.date, loc)} size={58} color={OG.parchment} font={serif} weight={700} align="center" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 920 }}>
          <div style={{ display: 'flex', padding: '10px 30px', borderRadius: 999, background: 'rgba(201,151,58,0.16)', border: '2px solid rgba(201,151,58,0.45)' }}>
            <OgLine text={t.kind === 'hillula' ? S.hillula[loc] : S.daily[loc]} size={40} color={OG.goldSoft} font={sans} weight={500} align="center" />
          </div>
          <div style={{ display: 'flex', marginTop: 40 }}>
            <OgLine text={name} size={nameSize} color={OG.parchment} font={serif} weight={700} align="center" />
          </div>
          {(era || years) && (
            <div style={{ display: 'flex', marginTop: 30 }}>
              <OgLine text={[era, years].filter(Boolean).join('  ·  ')} size={40} color={OG.muted} font={sans} weight={500} align="center" />
            </div>
          )}
          {line && (
            <div style={{ display: 'flex', marginTop: 44 }}>
              <OgLine text={line} size={40} color={OG.parchment} font={sans} weight={500} align="center" />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <OgLine text={S.more[loc]} size={34} color={OG.goldSoft} font={sans} weight={500} align="center" />
          <div style={{ display: 'flex', marginTop: 20, fontSize: 32, color: OG.muted, fontFamily: 'PT Sans' }}>{host}</div>
          <div style={{ display: 'flex', marginTop: 10 }}>
            <OgLine text={UI[loc].appTitle} size={30} color={OG.gold} font={serif} weight={700} align="center" />
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' } },
  )
}
