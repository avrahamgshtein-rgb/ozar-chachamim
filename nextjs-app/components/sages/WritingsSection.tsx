// "כתבים ברשת": where the sage's own writings can be read. Sefaria lists his works
// (or, for a sage who wrote no book it lists, the page that gathers every source in
// which he appears), and Hebrew Wikisource keeps an author page with his texts.
// Server-rendered links only; nothing is fetched from either until a click.
import type { Locale } from '@/lib/types'
import { sefariaTopicUrl, sefariaWorkUrl, type SefariaEntry, type SefariaWork } from '@/lib/sefaria'
import { wikisourceUrl } from '@/lib/wikipedia'

const S = {
  titleWorks: { he: 'כתבים בספריא', en: 'Writings on Sefaria', ru: 'Сочинения на Sefaria' },
  titleSources: { he: 'מקורות בספריא', en: 'Sources on Sefaria', ru: 'Источники на Sefaria' },
  titleWikisource: { he: 'כתבים בוויקיטקסט', en: 'Writings on Wikisource', ru: 'Сочинения на Викитеке' },
  introWorks: {
    he: 'הכתבים של {name} פתוחים לקריאה בספריא, ספרייה חופשית של מקורות היהדות. לחיצה על כותרת פותחת את הטקסט עצמו.',
    en: 'The writings of {name} can be read on Sefaria, a free library of Jewish texts. A title opens the text itself.',
    ru: 'Сочинения {name} можно читать на Sefaria — бесплатной библиотеке еврейских текстов. Название открывает сам текст.',
  },
  introSources: {
    he: 'ספריא מקבצת בדף אחד את המקורות שבהם מופיע {name}: משנה, תלמוד, מדרשים ופירושים.',
    en: 'Sefaria gathers on one page the sources in which {name} appears: Mishnah, Talmud, midrash and commentary.',
    ru: 'Sefaria собирает на одной странице источники, в которых упоминается {name}: Мишна, Талмуд, мидраш и комментарии.',
  },
  introWikisource: {
    he: 'ויקיטקסט, הספרייה החופשית של ויקיפדיה, מקבצת בדף מחבר אחד את הטקסטים של {name}.',
    en: "Hebrew Wikisource, Wikipedia's free library, collects the texts of {name} on one author page.",
    ru: 'Ивритская Викитека, свободная библиотека Википедии, собирает тексты {name} на одной авторской странице.',
  },
  allWorks: { he: 'כל הכתבים של {name} בספריא', en: 'All writings of {name} on Sefaria', ru: 'Все сочинения {name} на Sefaria' },
  allSources: { he: 'המקורות על {name} בספריא', en: 'Sources about {name} on Sefaria', ru: 'Источники о {name} на Sefaria' },
  wikisource: { he: 'הכתבים של {name} בוויקיטקסט', en: 'Texts of {name} on Wikisource', ru: 'Тексты {name} на Викитеке' },
  collection: { he: 'אוסף', en: 'Collection', ru: 'Собрание' },
  more: { he: 'ועוד {n} בספריא', en: 'and {n} more on Sefaria', ru: 'и ещё {n} на Sefaria' },
  credit: {
    he: 'התוכן מספריא (sefaria.org) וממיזמי ויקימדיה, פרויקטים ללא כוונת רווח.',
    en: 'Content from Sefaria (sefaria.org) and Wikimedia projects, non-profit projects.',
    ru: 'Материалы Sefaria (sefaria.org) и проектов Викимедиа, некоммерческих проектов.',
  },
  creditWikisource: {
    he: 'התוכן מוויקיטקסט (he.wikisource.org), מיזם של ויקימדיה ללא כוונת רווח.',
    en: 'Content from Hebrew Wikisource (he.wikisource.org), a non-profit Wikimedia project.',
    ru: 'Материалы ивритской Викитеки (he.wikisource.org), некоммерческого проекта Викимедиа.',
  },
  newTab: { he: '(נפתח בלשונית חדשה)', en: '(opens in a new tab)', ru: '(откроется в новой вкладке)' },
} satisfies Record<string, Record<Locale, string>>

const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))

/** Sefaria's titles are Hebrew and English; Russian pages show the English one. */
function titleFor(w: SefariaWork, locale: Locale): { text: string; dir: 'rtl' | 'ltr' } {
  if (locale === 'he') return w.he ? { text: w.he, dir: 'rtl' } : { text: w.en, dir: 'ltr' }
  return w.en ? { text: w.en, dir: 'ltr' } : { text: w.he, dir: 'rtl' }
}

/** "רש״י (רבי שלמה יצחקי)" reads badly inside a sentence; the short name does. */
const shortName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()

export function WritingsSection({
  sefaria, wikisource, locale, name: fullName, accent,
}: {
  sefaria?: SefariaEntry
  /** Title of the Hebrew Wikisource author page. */
  wikisource?: string
  locale: Locale
  name: string
  accent: string
}) {
  if (!sefaria && !wikisource) return null

  // Hebrew pages use the roster's short name. English and Russian pages use
  // Sefaria's own English title where there is one, so a Latin name does not sit
  // inside a right-to-left parenthesis in a left-to-right sentence.
  const name = locale === 'he'
    ? shortName(fullName) || sefaria?.he || ''
    : sefaria?.en || shortName(fullName)
  const hasWorks = !!sefaria && sefaria.works.length > 0
  const title = !sefaria ? S.titleWikisource[locale] : hasWorks ? S.titleWorks[locale] : S.titleSources[locale]
  const intro = fill(!sefaria ? S.introWikisource[locale] : hasWorks ? S.introWorks[locale] : S.introSources[locale], { name })
  // Sefaria can list more works than the page shows; the rest are one click away.
  const extra = sefaria ? Math.max(0, sefaria.total - sefaria.works.length) : 0

  const pill = 'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-ink-50 transition-colors hover:brightness-125'
  const pillStyle = { borderColor: `${accent}66`, background: `${accent}22` }

  return (
    <section id="writings" aria-labelledby="writings-title" className="scroll-mt-20">
      <h2 id="writings-title" className="mb-3 text-xs font-sans font-semibold uppercase tracking-widest text-ink-500">{title}</h2>
      <div className="rounded-2xl border border-ink-700/40 bg-ink-800/25 p-4 md:p-5">
        <p dir="auto" className="text-sm leading-relaxed text-ink-300">{intro}</p>

        {hasWorks && (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sefaria.works.map(w => {
              const t = titleFor(w, locale)
              return (
                <li key={w.url}>
                  <a href={sefariaWorkUrl(w.url)} target="_blank" rel="noopener noreferrer"
                    className="flex h-full items-center gap-2.5 rounded-xl border border-ink-700/40 bg-ink-800/50 px-3 py-2.5 text-sm text-ink-100 transition-colors hover:border-gold-500/40 hover:text-gold-300">
                    <span aria-hidden className="text-base">{w.cat ? '📚' : '📖'}</span>
                    <span dir={t.dir} className="min-w-0 flex-1 truncate">{t.text}</span>
                    {w.cat && (
                      <span className="flex-shrink-0 rounded-full bg-ink-700/60 px-2 py-0.5 text-[10px] text-ink-300">{S.collection[locale]}</span>
                    )}
                    <span className="sr-only">{S.newTab[locale]}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {sefaria && (
            <a href={sefariaTopicUrl(sefaria.slug)} target="_blank" rel="noopener noreferrer" className={pill} style={pillStyle}>
              <span aria-hidden>📜</span>
              {fill(hasWorks ? S.allWorks[locale] : S.allSources[locale], { name })}
              <span className="sr-only">{S.newTab[locale]}</span>
            </a>
          )}
          {wikisource && (
            <a href={wikisourceUrl(wikisource)} target="_blank" rel="noopener noreferrer" className={pill}
              style={sefaria ? undefined : pillStyle}>
              <span aria-hidden>📚</span>
              {fill(S.wikisource[locale], { name })}
              <span className="sr-only">{S.newTab[locale]}</span>
            </a>
          )}
          {extra > 0 && (
            <span className="text-xs text-ink-400">{fill(S.more[locale], { n: extra })}</span>
          )}
        </div>

        <p className="mt-3 text-[11px] text-ink-500">{(sefaria ? S.credit : S.creditWikisource)[locale]}</p>
      </div>
    </section>
  )
}
