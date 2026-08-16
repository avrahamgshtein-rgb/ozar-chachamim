import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

const translations = {
  he: {
    title: '🏛️ אוצר חכמים',
    subtitle: 'בסיס ידע מובנה על חכמי ישראל לדורותיהם',
    description: 'עם ויזואליזציה דינמית של קשרים בין חכמים המיועדת לתלמידי ישיבות ובוגריהן.',
    network: 'הרשת שלנו',
    sages: 'חכמים',
    connections: 'קשרים',
    research: 'חכמים עם מחקר',
    coverage: 'כיסוי גיאוגרפי',
    features: '✨ תכונות ראשיות',
    feature1: 'רשת קשרים אינטראקטיבית — D3.js force-directed network',
    feature2: 'מפה גיאוגרפית — עקוב אחר מיקומים והגירות של חכמים',
    feature3: 'חיפוש מתקדם — תמיכה בתרגומים בעברית ותצורות שונות',
    feature4: 'מסמכי מחקר — 423 מסמכי מחקר סקורים ומיוחסים',
    feature5: 'חומרי הוראה — תכניות שיעור של 45 דקות ושאלות דיון',
    feature6: 'ממשק דו-לשוני — עברית (RTL) ואנגלית מלאות',
    feature7: 'responsive לכל מכשיר — שולחני, טאבלט, סלולרי',
    projectLead: '👤 מנהל הפרויקט',
    techStack: '💻 Tech Stack',
    dataSources: '📚 מקורות הנתונים',
    spirit: '🎓 רוח הפרויקט',
    spirit_text: 'אנחנו מאמינים שחכמי ישראל לא צריכים להיות שמות בספר, אלא דמויות חיות המחוברות בדוגמה, בוויכוח ובהשפעה הדדית. פרויקט זה שומר על החוכמה שלהם בזמן שהוא עושה אותה נגישה לדור הבא של חוקרים ותלמידים.',
    footer: 'אוצר חכמים — Preserving the Wisdom of Our Sages',
    updated: 'עודכן: אוגוסט 2026 | Version 2.0',
  },
  en: {
    title: '🏛️ Ozar Chachamim',
    subtitle: 'The Knowledge Graph of Jewish Sages',
    description: 'An interactive knowledge base serving yeshiva students and graduates.',
    network: 'Our Network',
    sages: 'Sages',
    connections: 'Connections',
    research: 'Sages with Research',
    coverage: 'Geographic Coverage',
    features: '✨ Key Features',
    feature1: 'Interactive Connection Network — D3.js force-directed network',
    feature2: 'Geographic Map — Track sage locations and migration paths',
    feature3: 'Advanced Search — Support for Hebrew transliterations',
    feature4: 'Research Documents — 423 scholarly summaries',
    feature5: 'Teaching Materials — 45-minute lesson plans and discussions',
    feature6: 'Bilingual Interface — Full Hebrew (RTL) and English support',
    feature7: 'Responsive Design — Works on desktop, tablet, mobile',
    projectLead: '👤 Project Lead',
    techStack: '💻 Tech Stack',
    dataSources: '📚 Data Sources',
    spirit: '🎓 Project Spirit',
    spirit_text: 'We believe Jewish sages should not be names in a book, but living figures connected through example, debate, and mutual influence. This project preserves their wisdom while making it accessible to the next generation of researchers and students.',
    footer: 'Ozar Chachamim — Preserving the Wisdom of Our Sages',
    updated: 'Updated: August 2026 | Version 2.0',
  },
  ru: {
    title: '🏛️ Оцар Хахамим',
    subtitle: 'Граф знаний еврейских мудрецов',
    description: 'Интерактивная база знаний для студентов и выпускников ешив.',
    network: 'Наша сеть',
    sages: 'Мудрецы',
    connections: 'Связи',
    research: 'Мудрецы с исследованиями',
    coverage: 'Географическое покрытие',
    features: '✨ Основные возможности',
    feature1: 'Интерактивная сеть соединений — D3.js force-directed network',
    feature2: 'Географическая карта — отслеживание местоположения и путей миграции',
    feature3: 'Расширенный поиск — поддержка еврейской транслитерации',
    feature4: 'Исследовательские документы — 423 научных резюме',
    feature5: 'Учебные материалы — планы уроков на 45 минут и обсуждения',
    feature6: 'Двуязычный интерфейс — полная поддержка иврита (RTL) и английского',
    feature7: 'Адаптивный дизайн — работает на настольных компьютерах, планшетах, мобильных',
    projectLead: '👤 Руководитель проекта',
    techStack: '💻 Технологический стек',
    dataSources: '📚 Источники данных',
    spirit: '🎓 Дух проекта',
    spirit_text: 'Мы верим, что еврейские мудрецы должны быть не просто имена в книге, а живые фигуры, связанные примером, дебатами и взаимным влиянием. Этот проект сохраняет их мудрость, делая её доступной для следующего поколения исследователей и студентов.',
    footer: 'Оцар Хахамим — сохраняя мудрость наших мудрецов',
    updated: 'Обновлено: август 2026 | Версия 2.0',
  },
}

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale
  const t = translations[validLocale]
  const isHe = validLocale === 'he'

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 py-16 px-6 ${isHe ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold font-serif text-gold-400 mb-4">{t.title}</h1>
          <p className="text-xl text-slate-300 mb-2">{t.subtitle}</p>
          <p className="text-slate-400">{t.description}</p>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 text-center">
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">422</div>
            <div className="text-sm text-slate-400">{t.sages}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">1,624</div>
            <div className="text-sm text-slate-400">{t.connections}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">309</div>
            <div className="text-sm text-slate-400">{t.research}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-gold-500/20">
            <div className="text-3xl font-bold text-gold-400">9</div>
            <div className="text-sm text-slate-400">{t.coverage}</div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gold-400 mb-8">{t.features}</h2>
          <ul className="space-y-3">
            {[
              t.feature1,
              t.feature2,
              t.feature3,
              t.feature4,
              t.feature5,
              t.feature6,
              t.feature7,
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-300">
                <span className="text-gold-400 mt-1">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Project Lead */}
        <div className="bg-slate-800/30 rounded-lg p-8 mb-16 border border-gold-500/10">
          <h3 className="text-xl font-bold text-gold-400 mb-4">{t.projectLead}</h3>
          <p className="text-lg font-semibold text-slate-200">Avraham Goldshtein</p>
          <a
            href="mailto:avraham.gshtein@gmail.com"
            className="text-gold-400 hover:text-gold-300 transition-colors"
          >
            avraham.gshtein@gmail.com
          </a>
        </div>

        {/* Tech Stack */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div>
            <h3 className="text-lg font-bold text-gold-400 mb-3">{t.techStack}</h3>
            <p className="text-slate-400 text-sm">
              Frontend: Next.js, TypeScript, Tailwind CSS
              <br />
              Visualization: D3.js v7, Leaflet.js
              <br />
              Data: Supabase, JSON
              <br />
              Deployment: Vercel
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gold-400 mb-3">{t.dataSources}</h3>
            <p className="text-slate-400 text-sm">
              Master dataset: Hebrew sages database
              <br />
              Research: 423 biographical documents across 309 sages
              <br />
              Geographic data: GeoNames, OpenStreetMap
              <br />
              Timeline: Talmudic sources & encyclopedias
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gold-400 mb-3">{t.spirit}</h3>
            <p className="text-slate-400 text-sm">{t.spirit_text}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gold-500/20 pt-8">
          <p className="text-lg font-semibold text-gold-400 mb-2">{t.footer}</p>
          <p className="text-sm text-slate-500">{t.updated}</p>
        </div>
      </div>
    </div>
  )
}
