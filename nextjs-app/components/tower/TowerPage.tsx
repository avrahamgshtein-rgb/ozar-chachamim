// The page around the tower, shared by /tower and /tower/<id> (the tower opened on one sage).
import type { Locale } from '@/lib/types'
import type { TowerData } from '@/lib/tower'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { TowerScene } from './TowerScene'

export const TOWER_TITLE = { he: 'מגדל הדורות', en: 'Tower of Generations', ru: 'Башня поколений' }
export const TOWER_SUBTITLE = {
  he: 'כל חכמי ישראל בתלת־ממד: הגובה הוא הזמן, הכיוון הוא המקום, והאור הוא המסירה מרב לתלמיד',
  en: 'Every sage in 3D: height is time, direction is place, and the light is the passing of Torah from teacher to student',
  ru: 'Все мудрецы в 3D: высота — время, направление — место, а свет — передача Торы от учителя к ученику',
}

const HINT = {
  he: 'גררו לסיבוב, צבטו או גללו לקירוב, ולחצו על חכם כדי להאיר את שלשלת המסירה שלו.',
  en: 'Drag to turn, pinch or scroll to zoom, and press a sage to light up his chain of transmission.',
  ru: 'Тяните, чтобы вращать, щипок или колесо для приближения; нажмите на мудреца, чтобы осветить его цепь передачи.',
}

export function TowerPage({ locale, data, initialSage }: { locale: Locale; data: TowerData; initialSage?: string }) {
  return (
    <div className="flex h-dvh flex-col bg-[#06050a] text-ink-100">
      {/* the language links follow the sage chosen in the scene (it keeps the address up to date) */}
      <SiteTopBar locale={locale} path="/tower" followUrl />
      <main id="main" className="relative min-h-0 flex-1">
        <div dir={locale === 'he' ? 'rtl' : 'ltr'} className="pointer-events-none absolute start-4 top-4 z-10 max-w-[19rem] md:start-6">
          <h1 className="font-serif text-2xl font-bold text-gold-300 md:text-3xl">{TOWER_TITLE[locale]}</h1>
          <p className="mt-1 hidden text-xs leading-relaxed text-ink-300 sm:block">{TOWER_SUBTITLE[locale]}</p>
          <p className="mt-2 hidden text-[11px] leading-relaxed text-ink-500 md:block">{HINT[locale]}</p>
        </div>
        <TowerScene data={data} locale={locale} initialSage={initialSage} />
      </main>
    </div>
  )
}
