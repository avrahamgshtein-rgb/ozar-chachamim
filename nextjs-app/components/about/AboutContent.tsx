'use client'

import type { Locale } from '@/lib/types'

const translations = {
  he: {
    title: 'אוצר חכמים',
    subtitle: 'בסיס ידע מובנה על חכמי ישראל לדורותיהם',
    description: 'עם ויזואליזציה דינמית של קשרים בין חכמים המיועדת לתלמידי ישיבות ובוגריהן.',
    network: 'הרשת שלנו',
    sages: 'חכמים',
    connections: 'קשרים',
    research: 'חכמים עם מחקר',
    coverage: 'כיסוי גיאוגרפי',
    features: '✨ תכונות ראשיות',
    feature1: 'רשת קשרים אינטראקטיבית',
    feature1_desc: 'D3.js force-directed network עם חיפוש בזמן אמת והדגשת קשרים',
    feature2: 'מפה גיאוגרפית',
    feature2_desc: 'עקוב אחר מיקומים והגירות של חכמים בעברות שונות',
    feature3: 'חיפוש מתקדם',
    feature3_desc: 'תמיכה בתרגומים בעברית ותצורות שונות של שמות',
    feature4: 'מסמכי מחקר',
    feature4_desc: '423 מסמכי מחקר סקורים ומיוחסים למקורותיהם',
    feature5: 'חומרי הוראה',
    feature5_desc: 'תכניות שיעור של 45 דקות עם שאלות דיון וחומרי השלמה',
    feature6: 'ממשק דו-לשוני',
    feature6_desc: 'עברית (RTL) ואנגלית מלאות עם תמיכה בשינוי שפה',
    feature7: 'responsive לכל מכשיר',
    feature7_desc: 'שולחני, טאבלט, סלולרי עם ממשק משודרג',
    projectLead: '👤 מנהל הפרויקט',
    techStack: '💻 Tech Stack',
    dataSources: '📚 מקורות הנתונים',
    spirit: '🎓 רוח הפרויקט',
    spirit_text: 'אנחנו מאמינים שחכמי ישראל לא צריכים להיות שמות בספר, אלא דמויות חיות המחוברות בדוגמה, בוויכוח ובהשפעה הדדית. פרויקט זה שומר על החוכמה שלהם בזמן שהוא עושה אותה נגישה לדור הבא של חוקרים ותלמידים.',
    footer: 'אוצר חכמים — Preserving the Wisdom of Our Sages',
    updated: 'עודכן: אוגוסט 2026 | Version 2.0',
    contact: 'צור קשר',
  },
  en: {
    title: 'Ozar Chachamim',
    subtitle: 'The Knowledge Graph of Jewish Sages',
    description: 'An interactive knowledge base serving yeshiva students and graduates.',
    network: 'Our Network',
    sages: 'Sages',
    connections: 'Connections',
    research: 'Sages with Research',
    coverage: 'Geographic Coverage',
    features: '✨ Key Features',
    feature1: 'Interactive Connection Network',
    feature1_desc: 'D3.js force-directed network with real-time search and connection highlighting',
    feature2: 'Geographic Map',
    feature2_desc: 'Track sage locations and migration paths across different periods',
    feature3: 'Advanced Search',
    feature3_desc: 'Support for Hebrew transliterations and multiple name formats',
    feature4: 'Research Documents',
    feature4_desc: '423 scholarly summaries reviewed and attributed to sources',
    feature5: 'Teaching Materials',
    feature5_desc: '45-minute lesson plans with discussion questions and resources',
    feature6: 'Bilingual Interface',
    feature6_desc: 'Full Hebrew (RTL) and English support with language switching',
    feature7: 'Responsive Design',
    feature7_desc: 'Desktop, tablet, mobile with optimized interface for each',
    projectLead: '👤 Project Lead',
    techStack: '💻 Tech Stack',
    dataSources: '📚 Data Sources',
    spirit: '🎓 Project Spirit',
    spirit_text: 'We believe Jewish sages should not be names in a book, but living figures connected through example, debate, and mutual influence. This project preserves their wisdom while making it accessible to the next generation of researchers and students.',
    footer: 'Ozar Chachamim — Preserving the Wisdom of Our Sages',
    updated: 'Updated: August 2026 | Version 2.0',
    contact: 'Contact',
  },
  ru: {
    title: 'Оцар Хахамим',
    subtitle: 'Граф знаний еврейских мудрецов',
    description: 'Интерактивная база знаний для студентов и выпускников ешив.',
    network: 'Наша сеть',
    sages: 'Мудрецы',
    connections: 'Связи',
    research: 'Мудрецы с исследованиями',
    coverage: 'Географическое покрытие',
    features: '✨ Основные возможности',
    feature1: 'Интерактивная сеть связей',
    feature1_desc: 'D3.js force-directed network с поиском в реальном времени и подсветкой связей',
    feature2: 'Географическая карта',
    feature2_desc: 'Отслеживание местоположений мудрецов и путей миграции по эпохам',
    feature3: 'Расширенный поиск',
    feature3_desc: 'Поддержка еврейской транслитерации и разных форм имён',
    feature4: 'Исследовательские документы',
    feature4_desc: '423 научных резюме, проверенных и атрибутированных источникам',
    feature5: 'Учебные материалы',
    feature5_desc: 'Планы уроков на 45 минут с вопросами для обсуждения',
    feature6: 'Многоязычный интерфейс',
    feature6_desc: 'Иврит (RTL), английский и русский с переключением языка',
    feature7: 'Адаптивный дизайн',
    feature7_desc: 'Настольные компьютеры, планшеты и мобильные устройства',
    projectLead: '👤 Руководитель проекта',
    techStack: '💻 Технологический стек',
    dataSources: '📚 Источники данных',
    spirit: '🎓 Дух проекта',
    spirit_text: 'Мы верим, что еврейские мудрецы — это не просто имена в книге, а живые фигуры, связанные примером, спором и взаимным влиянием. Этот проект сохраняет их мудрость и делает её доступной следующему поколению исследователей и учеников.',
    footer: 'Оцар Хахамим — сохраняя мудрость наших мудрецов',
    updated: 'Обновлено: август 2026 | Версия 2.0',
    contact: 'Контакт',
  },
}

export function AboutContent({ locale }: { locale: Locale }) {
  const isHe = locale === 'he'
  const t = translations[locale]

  const features = [
    { title: t.feature1, desc: t.feature1_desc },
    { title: t.feature2, desc: t.feature2_desc },
    { title: t.feature3, desc: t.feature3_desc },
    { title: t.feature4, desc: t.feature4_desc },
    { title: t.feature5, desc: t.feature5_desc },
    { title: t.feature6, desc: t.feature6_desc },
    { title: t.feature7, desc: t.feature7_desc },
  ]

  return (
    <div
      className={`absolute inset-0 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100 ${
        isHe ? 'rtl' : 'ltr'
      }`}
    >
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header with medallion image */}
        <div className="mb-12 text-center">
          <div className="flex justify-center mb-8">
            <img
              src="/images/temple-medallion.png"
              alt="Ozar Chachamim"
              className="w-56 h-56 md:w-72 md:h-72 drop-shadow-2xl"
            />
          </div>
          <h1 className="mb-4 text-5xl font-bold font-serif text-gold-400">{t.title}</h1>
          <p className="mb-2 text-xl text-slate-300">{t.subtitle}</p>
          <p className="text-slate-400">{t.description}</p>
        </div>

        {/* Network Stats */}
        <div className="mb-16 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          <div className="rounded-lg border border-gold-500/20 bg-slate-800/50 p-6">
            <div className="text-4xl font-bold text-gold-400">422</div>
            <div className="text-sm text-slate-400">{t.sages}</div>
          </div>
          <div className="rounded-lg border border-gold-500/20 bg-slate-800/50 p-6">
            <div className="text-4xl font-bold text-gold-400">1,624</div>
            <div className="text-sm text-slate-400">{t.connections}</div>
          </div>
          <div className="rounded-lg border border-gold-500/20 bg-slate-800/50 p-6">
            <div className="text-4xl font-bold text-gold-400">309</div>
            <div className="text-sm text-slate-400">{t.research}</div>
          </div>
          <div className="rounded-lg border border-gold-500/20 bg-slate-800/50 p-6">
            <div className="text-4xl font-bold text-gold-400">9</div>
            <div className="text-sm text-slate-400">{t.coverage}</div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-gold-400">{t.features}</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, idx) => (
              <div key={idx} className="rounded-lg border border-gold-500/10 bg-slate-800/20 p-6">
                <h3 className="mb-2 flex items-start gap-2 text-lg font-semibold text-gold-300">
                  <span className="text-gold-400">✓</span>
                  <span>{feature.title}</span>
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Project Lead & Info */}
        <div className="mb-16 grid gap-8 md:grid-cols-2">
          {/* Project Lead */}
          <div className="rounded-lg border border-gold-500/10 bg-slate-800/30 p-8">
            <h3 className="mb-4 text-xl font-bold text-gold-400">{t.projectLead}</h3>
            <p className="mb-1 text-lg font-semibold text-slate-200">Avraham Goldshtein</p>
            <a
              href="mailto:avraham.gshtein@gmail.com"
              className="text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              avraham.gshtein@gmail.com
            </a>
            <p className="mt-4 text-sm text-slate-500">
              {isHe ? 'מנהל הפרויקט, עיצוב מערכת וביצוע' : 'Project Lead, System Design & Implementation'}
            </p>
          </div>

          {/* Tech Stack */}
          <div className="rounded-lg border border-gold-500/10 bg-slate-800/30 p-8">
            <h3 className="mb-4 text-xl font-bold text-gold-400">{t.techStack}</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p><span className="text-gold-300">Frontend:</span> Next.js 13+, TypeScript, Tailwind CSS</p>
              <p><span className="text-gold-300">Visualization:</span> D3.js v7, Leaflet.js, Marker Clustering</p>
              <p><span className="text-gold-300">Backend:</span> Supabase PostgreSQL, REST API</p>
              <p><span className="text-gold-300">Deployment:</span> Vercel (Edge Network)</p>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="mb-16 rounded-lg border border-gold-500/10 bg-slate-800/30 p-8">
          <h3 className="mb-4 text-xl font-bold text-gold-400">{t.dataSources}</h3>
          <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-2">
            <div>
              <p className="font-semibold text-gold-300 mb-2">Master Dataset</p>
              <p>422 Hebrew sages with period, region, field classifications</p>
            </div>
            <div>
              <p className="font-semibold text-gold-300 mb-2">Research Base</p>
              <p>423 biographical documents across 309 sages, reviewed and summarized (with Hebrew/English/Russian variants)</p>
            </div>
            <div>
              <p className="font-semibold text-gold-300 mb-2">Geographic Data</p>
              <p>9 of the site&apos;s 10 geographic regions represented, keyword-matched from sage locations</p>
            </div>
            <div>
              <p className="font-semibold text-gold-300 mb-2">Connections</p>
              <p>1,624 validated relationships (student, teacher, colleague, etc.)</p>
            </div>
          </div>
        </div>

        {/* Project Spirit */}
        <div className="mb-16 rounded-lg border border-gold-500/10 bg-slate-800/30 p-8">
          <h3 className="mb-4 text-xl font-bold text-gold-400">{t.spirit}</h3>
          <p className="leading-relaxed text-slate-300">{t.spirit_text}</p>
        </div>

        {/* Footer */}
        <div className="border-t border-gold-500/20 pt-8 pb-12 text-center">
          <p className="mb-2 text-lg font-semibold text-gold-400">{t.footer}</p>
          <p className="text-sm text-slate-500">{t.updated}</p>
        </div>
      </div>
    </div>
  )
}
