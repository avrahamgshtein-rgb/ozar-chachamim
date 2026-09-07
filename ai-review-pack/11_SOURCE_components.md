# Source Bundle 2 / 2 — React Components

Every file under `components/` of the Next.js application, verbatim.
Paths are relative to the `nextjs-app/` directory. The `@/` import alias maps to that same root.

## Contents

- `components/about/AboutContent.tsx`
- `components/auth/AuthStatus.tsx`
- `components/auth/LoginForm.tsx`
- `components/auth/SignupForm.tsx`
- `components/auth/UserMenu.tsx`
- `components/chat/ChatWidget.tsx`
- `components/layout/AppShell.tsx`
- `components/layout/Drawer.tsx`
- `components/layout/Header.tsx`
- `components/layout/TabBar.tsx`
- `components/providers/LocaleProvider.tsx`
- `components/sages/ResearchSection.tsx`
- `components/sages/SageCard.tsx`
- `components/sages/SageFilters.tsx`
- `components/sages/SageMiniMap.tsx`
- `components/ui/Badge.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/EraChip.tsx`
- `components/ui/FAB.tsx`
- `components/ui/OnboardingTour.tsx`
- `components/ui/ReadingControls.tsx`
- `components/ui/SearchBar.tsx`
- `components/ui/VizSkeleton.tsx`
- `components/viz/Comparator.tsx`
- `components/viz/FilterChips.tsx`
- `components/viz/GenealogyTree.tsx`
- `components/viz/GeoMap.tsx`
- `components/viz/MapLegend.tsx`
- `components/viz/NetworkGraph.tsx`
- `components/viz/PathFinder.tsx`
- `components/viz/SagesTable.tsx`
- `components/viz/Timeline.tsx`
- `components/viz/Traditions.tsx`

---

## FILE: components/about/AboutContent.tsx

_(245 lines)_

```tsx
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
```

## FILE: components/auth/AuthStatus.tsx

_(69 lines)_

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-auth/client'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export function AuthStatus({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  if (!loaded) return null

  if (!user) {
    return (
      <Link
        href={`/${locale}/auth/login`}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-sans font-medium',
          'glass-light border border-ink-600/40',
          'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
          'transition-all duration-150',
        )}
      >
        {tr(locale, 'התחברות', 'Sign in', 'Войти')}
      </Link>
    )
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        'px-3 py-1.5 rounded-xl text-xs font-sans font-medium max-w-[140px] truncate',
        'glass-light border border-ink-600/40',
        'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
        'transition-all duration-150',
      )}
      title={tr(locale, 'התנתקות', 'Sign out', 'Выйти')}
    >
      {user.email}
    </button>
  )
}
```

## FILE: components/auth/LoginForm.tsx

_(101 lines)_

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-auth/client'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      // Log the real Supabase error — the code/status distinguish "wrong
      // password" from "email not confirmed", a misconfigured project URL,
      // a network/CORS failure, etc., none of which look the same to the user.
      console.error('[login] signInWithPassword failed:', {
        message: error.message, status: error.status, code: (error as { code?: string }).code,
      })
      if (error.message === 'Email not confirmed') {
        setError(tr(locale,
          'האימייל עדיין לא אושר. אשר אותו קודם (בדוא"ל או ידנית ב-Supabase) ואז נסה שוב.',
          'Email not confirmed yet. Confirm it first (via email or manually in Supabase), then try again.',
          'Email ещё не подтверждён. Сначала подтвердите его, затем повторите попытку.'))
      } else if (error.message === 'Invalid login credentials') {
        setError(tr(locale, 'אימייל או סיסמה שגויים', 'Incorrect email or password', 'Неверный email или пароль'))
      } else {
        setError(`${tr(locale, 'שגיאה', 'Error', 'Ошибка')}: ${error.message}`)
      }
      return
    }
    router.push(`/${locale}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-xs font-sans text-ink-400 mb-1.5">
          {tr(locale, 'אימייל', 'Email', 'Email')}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-sm
                     focus:outline-none focus:border-gold-500/60 transition-colors"
          dir="ltr"
        />
      </div>
      <div>
        <label className="block text-xs font-sans text-ink-400 mb-1.5">
          {tr(locale, 'סיסמה', 'Password', 'Пароль')}
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-sm
                     focus:outline-none focus:border-gold-500/60 transition-colors"
          dir="ltr"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-gold-500/20 border border-gold-500/50 text-gold-300
                   text-sm font-sans font-semibold hover:bg-gold-500/30 transition-colors disabled:opacity-50"
      >
        {loading
          ? tr(locale, 'מתחבר…', 'Signing in…', 'Вход…')
          : tr(locale, 'התחברות', 'Sign in', 'Войти')}
      </button>

      <p className="text-xs text-ink-500 text-center">
        {tr(locale, 'אין לך חשבון?', "Don't have an account?", 'Нет аккаунта?')}{' '}
        <Link href={`/${locale}/auth/signup`} className="text-gold-400 hover:text-gold-300">
          {tr(locale, 'הרשמה', 'Sign up', 'Регистрация')}
        </Link>
      </p>
    </form>
  )
}
```

## FILE: components/auth/SignupForm.tsx

_(105 lines)_

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-auth/client'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export function SignupForm({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}` },
    })
    setLoading(false)
    if (error) {
      setError(
        error.message.includes('already registered') || error.message.includes('already exists')
          ? tr(locale, 'כתובת האימייל כבר רשומה', 'This email is already registered', 'Этот email уже зарегистрирован')
          : tr(locale, 'שגיאה בהרשמה, נסה שוב', 'Signup failed, please try again', 'Ошибка регистрации, попробуйте снова'),
      )
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="max-w-sm text-center space-y-2">
        <p className="text-sm text-ink-200">
          {tr(locale,
            'שלחנו לך מייל אימות — לחץ על הקישור כדי להשלים את ההרשמה.',
            "We've sent a confirmation email — click the link to complete signup.",
            'Мы отправили письмо для подтверждения — перейдите по ссылке, чтобы завершить регистрацию.')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      <div>
        <label className="block text-xs font-sans text-ink-400 mb-1.5">
          {tr(locale, 'אימייל', 'Email', 'Email')}
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-sm
                     focus:outline-none focus:border-gold-500/60 transition-colors"
          dir="ltr"
        />
      </div>
      <div>
        <label className="block text-xs font-sans text-ink-400 mb-1.5">
          {tr(locale, 'סיסמה (6 תווים לפחות)', 'Password (min. 6 characters)', 'Пароль (мин. 6 символов)')}
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-sm
                     focus:outline-none focus:border-gold-500/60 transition-colors"
          dir="ltr"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-gold-500/20 border border-gold-500/50 text-gold-300
                   text-sm font-sans font-semibold hover:bg-gold-500/30 transition-colors disabled:opacity-50"
      >
        {loading
          ? tr(locale, 'נרשם…', 'Signing up…', 'Регистрация…')
          : tr(locale, 'הרשמה', 'Sign up', 'Зарегистрироваться')}
      </button>

      <p className="text-xs text-ink-500 text-center">
        {tr(locale, 'כבר יש לך חשבון?', 'Already have an account?', 'Уже есть аккаунт?')}{' '}
        <Link href={`/${locale}/auth/login`} className="text-gold-400 hover:text-gold-300">
          {tr(locale, 'התחברות', 'Sign in', 'Войти')}
        </Link>
      </p>
    </form>
  )
}
```

## FILE: components/auth/UserMenu.tsx

_(95 lines)_

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

export function UserMenu({ locale }: { locale: Locale }) {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return null

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    })
    setMessage(error
      ? error.message
      : tr(locale, 'קישור כניסה נשלח למייל', 'A sign-in link was sent', 'Ссылка для входа отправлена'))
  }

  async function signOut() {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(value => !value)}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-sans',
          'glass-light border border-ink-600/40 text-ink-300',
          'hover:text-gold-300 hover:border-gold-500/30 transition-all',
        )}
        aria-expanded={open}
      >
        {user ? tr(locale, 'האזור שלי', 'My library', 'Моя библиотека') : tr(locale, 'כניסה', 'Sign in', 'Войти')}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full end-0 mt-2 z-50 w-72 glass rounded-xl border border-ink-700/50 p-4 shadow-glass-lg">
            {user ? (
              <div className="space-y-3">
                <p className="text-xs text-ink-300 truncate">{user.email}</p>
                <p className="text-xs text-ink-500">
                  {tr(locale, 'הסימניות וההערות נשמרות בחשבונך.', 'Bookmarks and notes are saved to your account.', 'Закладки и заметки сохраняются в аккаунте.')}
                </p>
                <button onClick={signOut} className="text-xs text-gold-300 hover:text-gold-200">
                  {tr(locale, 'יציאה', 'Sign out', 'Выйти')}
                </button>
              </div>
            ) : (
              <form onSubmit={signIn} className="space-y-3">
                <label className="block text-xs text-ink-300">
                  {tr(locale, 'דוא״ל לקבלת קישור כניסה', 'Email for a sign-in link', 'Email для ссылки входа')}
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-ink-600/50 bg-ink-900/70 px-3 py-2 text-ink-100 outline-none focus:border-gold-500/50"
                    dir="ltr"
                  />
                </label>
                <button type="submit" className="w-full rounded-lg bg-gold-500/15 border border-gold-500/30 px-3 py-2 text-xs text-gold-300">
                  {tr(locale, 'שלח קישור', 'Send link', 'Отправить ссылку')}
                </button>
                {message && <p className="text-xs text-ink-400">{message}</p>}
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
```

## FILE: components/chat/ChatWidget.tsx

_(258 lines)_

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

interface ChatMessageView {
  role: 'user' | 'assistant'
  content: string
  noMatch?: boolean
}

interface Quota {
  limit: number
  remaining: number
}

export function ChatWidget({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isRtl = locale === 'he'

  useEffect(() => {
    fetch(`/api/chat?locale=${locale}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        setAuthenticated(!!data.authenticated)
        setQuota(data.quota ?? null)
      })
      .catch(() => {})
  }, [locale])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, isOpen])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || sending) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: message }])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, locale }),
      })
      const data = await res.json()

      if (data.quota) setQuota(data.quota)

      if (!res.ok) {
        if (data.error === 'quota_exhausted') {
          setError(authenticated
            ? tr(locale,
              'נגמרו השאלות החינמיות שלך לתקופה זו.',
              'You have used all your free questions for this period.',
              'У вас закончились бесплатные вопросы за этот период.')
            : tr(locale,
              'נגמרו שאלות הניסיון. הירשם כדי להמשיך לשאול בחינם.',
              'You have used all your trial questions. Sign up to keep asking for free.',
              'Пробные вопросы закончились. Зарегистрируйтесь, чтобы продолжить бесплатно.'))
        } else if (data.error === 'session_invalid') {
          setError(tr(locale,
            'החשבון שלך כבר רשום במערכת — התחבר כדי להמשיך.',
            'This session is already linked to an account — please sign in.',
            'Эта сессия уже связана с аккаунтом — войдите, чтобы продолжить.'))
        } else {
          setError(tr(locale, 'משהו השתבש. נסה שוב.', 'Something went wrong. Please try again.', 'Что-то пошло не так. Попробуйте снова.'))
        }
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, noMatch: data.noMatch }])
      if (data.sessionId) setSessionId(data.sessionId)
    } catch {
      setError(tr(locale, 'שגיאת רשת. נסה שוב.', 'Network error. Please try again.', 'Ошибка сети. Попробуйте снова.'))
    } finally {
      setSending(false)
    }
  }

  const quotaExhausted = quota !== null && quota.remaining <= 0

  return (
    <>
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen
          ? tr(locale, 'סגור צ׳אט', 'Close chat', 'Закрыть чат')
          : tr(locale, 'שאל שאלה', 'Ask a question', 'Задать вопрос')}
        title={tr(locale, 'שאל את החכמים', 'Ask the sages', 'Спросите мудрецов')}
        className={cn(
          'fixed bottom-20 start-4 z-40',
          'w-14 h-14 rounded-full',
          'glass border border-gold-500/30',
          'flex items-center justify-center',
          'shadow-gold-glow transition-all duration-200',
          'hover:border-gold-400/60 hover:scale-105 active:scale-95',
          isOpen && 'border-gold-400/60 bg-ink-700/80',
        )}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.08-.163-3.02-.463L3 21l1.5-4.5C3.55 15.163 3 13.62 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
        {quota !== null && quota.remaining > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-ink-900 text-[10px] font-bold flex items-center justify-center">
            {quota.remaining}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className={cn(
            'fixed z-40 flex flex-col',
            'bottom-36 start-4 w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[520px]',
            'glass rounded-2xl border border-gold-500/20 shadow-glass overflow-hidden',
            'animate-fade-in',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/50">
            <div>
              <h3 className="font-serif text-sm font-bold text-gold-300">
                {tr(locale, 'שאל את החכמים', 'Ask the Sages', 'Спросите мудрецов')}
              </h3>
              {quota && (
                <QuotaBar quota={quota} locale={locale} authenticated={authenticated} />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
              className="text-ink-500 hover:text-ink-200 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-ink-500 leading-relaxed">
                {authenticated
                  ? tr(locale,
                    'שאל כל שאלה על חכמי ישראל, תולדותיהם וקשריהם.',
                    'Ask anything about the sages of Israel, their lives, and their connections.',
                    'Задайте любой вопрос о еврейских мудрецах, их жизни и связях.')
                  : tr(locale,
                    'שאל שאלה בלי להירשם — יש לך כמה שאלות ניסיון בחינם.',
                    "Ask a question without signing up — you have a few free trial questions.",
                    'Задайте вопрос без регистрации — у вас есть несколько бесплатных пробных вопросов.')}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'ms-auto bg-gold-500/15 border border-gold-500/30 text-ink-100'
                    : 'me-auto bg-ink-800/60 border border-ink-700/50 text-ink-200',
                )}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="me-auto max-w-[85%] rounded-xl px-3 py-2 text-xs bg-ink-800/60 border border-ink-700/50 text-ink-500">
                {tr(locale, 'חושב…', 'Thinking…', 'Думаю…')}
              </div>
            )}
            {error && (
              <div className="rounded-xl px-3 py-2 text-xs bg-red-500/10 border border-red-500/30 text-red-300">
                {error}
                {!authenticated && quotaExhausted && (
                  <Link href={`/${locale}/auth/signup`} className="block mt-1.5 font-semibold text-gold-300 hover:text-gold-200 underline">
                    {tr(locale, 'הרשמה חינם ←', 'Sign up for free →', 'Регистрация бесплатно →')}
                  </Link>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-ink-700/50">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={sending || quotaExhausted}
              placeholder={quotaExhausted
                ? tr(locale, 'נגמרו השאלות החינמיות', 'Out of free questions', 'Бесплатные вопросы закончились')
                : tr(locale, 'הקלד שאלה…', 'Type a question…', 'Введите вопрос…')}
              className="flex-1 px-3 py-2 rounded-lg bg-ink-800/50 border border-ink-700/50 text-ink-100 text-xs
                         focus:outline-none focus:border-gold-500/60 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim() || quotaExhausted}
              className="px-3 py-2 rounded-lg bg-gold-500/20 border border-gold-500/50 text-gold-300
                         text-xs font-sans font-semibold hover:bg-gold-500/30 transition-colors disabled:opacity-40"
            >
              {tr(locale, 'שלח', 'Send', 'Отпр.')}
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function QuotaBar({ quota, locale, authenticated }: { quota: Quota; locale: Locale; authenticated: boolean }) {
  const used = Math.max(quota.limit - quota.remaining, 0)
  const pct = quota.limit > 0 ? Math.min((used / quota.limit) * 100, 100) : 100
  return (
    <div className="mt-1 w-36">
      <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
        <span>
          {authenticated
            ? tr(locale, 'שאלות שנותרו', 'Questions left', 'Вопросов осталось')
            : tr(locale, 'ניסיון חינם', 'Free trial', 'Пробный период')}
        </span>
        <span>{quota.remaining}/{quota.limit}</span>
      </div>
      <div className="h-1 rounded-full bg-ink-700/60 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', quota.remaining > 0 ? 'bg-gold-500/70' : 'bg-red-500/60')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

## FILE: components/layout/AppShell.tsx

_(316 lines)_

```tsx
'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Header } from './Header'
import { TabBar } from './TabBar'
import { Drawer } from './Drawer'
import { SearchBar } from '@/components/ui/SearchBar'
import { FAB } from '@/components/ui/FAB'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { SageCard } from '@/components/sages/SageCard'
import { VizSkeleton } from '@/components/ui/VizSkeleton'
import { OnboardingTour } from '@/components/ui/OnboardingTour'
import { SageFilters } from '@/components/sages/SageFilters'
import { Comparator } from '@/components/viz/Comparator'
import { FilterChips } from '@/components/viz/FilterChips'
import { MapLegend } from '@/components/viz/MapLegend'
import { useAppStore } from '@/store/useAppStore'
import { fetchSages, fetchConnections, fetchLocalGraphData } from '@/lib/supabase'
import { fetchContentOverlay, applyOverlay } from '@/lib/contentOverlay'
import type { Locale, Tab } from '@/lib/types'

// Dynamic imports — browser-only visualization libraries.
// Each tab shows a skeleton screen while its chunk loads.
const NetworkGraph = dynamic(
  () => import('@/components/viz/NetworkGraph').then(m => ({ default: m.NetworkGraph })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const GeoMap = dynamic(
  () => import('@/components/viz/GeoMap').then(m => ({ default: m.GeoMap })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const Timeline = dynamic(
  () => import('@/components/viz/Timeline').then(m => ({ default: m.Timeline })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const Traditions = dynamic(
  () => import('@/components/viz/Traditions').then(m => ({ default: m.Traditions })),
  { ssr: false, loading: () => <VizSkeleton variant="list" /> },
)
const SagesTable = dynamic(
  () => import('@/components/viz/SagesTable').then(m => ({ default: m.SagesTable })),
  { ssr: false, loading: () => <VizSkeleton variant="list" /> },
)
const GenealogyTree = dynamic(
  () => import('@/components/viz/GenealogyTree').then(m => ({ default: m.GenealogyTree })),
  { ssr: false, loading: () => <VizSkeleton /> },
)
const AboutContent = dynamic(
  () => import('@/components/about/AboutContent').then(m => ({ default: m.AboutContent })),
  { ssr: false, loading: () => <VizSkeleton /> },
)

interface AppShellProps {
  locale: Locale
  initialTotal: number
  initialLastUpdate: string
}

export function AppShell({ locale, initialTotal, initialLastUpdate }: AppShellProps) {
  const otherLocale: Locale = locale === 'he' ? 'en' : 'he'

  const {
    activeTab,
    isDrawerOpen,
    isFiltersOpen,
    isSearchOpen,
    isComparatorOpen,
    selectedSage,
    selectedSageId,
    sageMap,
    closeDrawer,
    closeFilters,
    closeComparator,
    selectSage,
    setData,
  } = useAppStore()

  // Theme bootstrap (persisted)
  useEffect(() => { useAppStore.getState().initTheme() }, [])

  // Bootstrap data
  useEffect(() => {
    setData([], [], initialTotal, initialLastUpdate)
    ;(async () => {
      let [sages, connections] = await Promise.all([
        fetchSages(),
        fetchConnections(),
      ])
      // Supabase still carries the old sparse connection set — fall back to
      // the canonical data.json whenever it is richer (keeps parity with Vercel)
      if (connections.length < 100 || sages.length < 300) {
        const local = await fetchLocalGraphData()
        if (local.connections.length > connections.length) {
          sages = local.sages
          connections = local.connections
          console.log('[AppShell] ↪ using data.json fallback (richer dataset)')
        }
      }
      // Supplemental datasets — kept in separate files so canonical data.json
      // stays untouched: biblical figures (ancient eras) + missing giants
      // (Rashi, Hillel, Besht, Gra...)
      for (const src of ['/data-ancient.json', '/data-supplement.json', '/data-supplement-2.json', '/data-research-links.json']) {
        try {
          const extra = await fetch(src).then(r => r.ok ? r.json() : null)
          if (extra?.nodes?.length || extra?.links?.length) {
            const existing = new Set(sages.map(s => s.id))
            sages = [...sages, ...(extra.nodes ?? []).filter((n: { id: string }) => !existing.has(n.id))]
            connections = [...connections, ...(extra.links ?? [])]
            console.log(`[AppShell] 🏛 ${src}: +${extra.nodes?.length ?? 0} figures, +${extra.links?.length ?? 0} links`)
          }
        } catch { /* optional dataset */ }
      }

      // Field patches for existing sages (e.g. works lists) — locale-independent
      try {
        const patch = await fetch('/data-patch.json').then(r => r.ok ? r.json() : null)
        if (patch) {
          sages = sages.map(s => patch[s.id] ? { ...s, ...patch[s.id] } : s)
          console.log(`[AppShell] 🩹 data-patch: ${Object.keys(patch).length} sages patched`)
        }
      } catch { /* optional */ }

      // Content localization: merge per-locale translated fields (Phase 2)
      const overlay = await fetchContentOverlay(locale)
      sages = applyOverlay(sages, overlay)
      setData(sages, connections, sages.length, initialLastUpdate)
      console.log(`[AppShell] ✅ ${sages.length} sages, ${connections.length} connections`)
    })()
  }, [initialTotal, initialLastUpdate, setData, locale])

  // URL deep-linking: read ?tab= on mount (every view has a shareable URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    const VALID: Tab[] = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']
    if (tab && (VALID as string[]).includes(tab)) {
      useAppStore.getState().setActiveTab(tab as Tab)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // URL deep-linking: read ?sage= on data load
  useEffect(() => {
    if (!sageMap.size) return
    const params = new URLSearchParams(window.location.search)
    const sageId = params.get('sage')
    if (sageId) {
      const sage = sageMap.get(sageId)
      if (sage) selectSage(sage)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sageMap.size])

  // URL deep-linking: write ?sage= + ?tab= when they change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (selectedSageId) {
      url.searchParams.set('sage', selectedSageId)
    } else {
      url.searchParams.delete('sage')
    }
    if (activeTab && activeTab !== 'graph') {
      url.searchParams.set('tab', activeTab)
    } else {
      url.searchParams.delete('tab')
    }
    window.history.replaceState({}, '', url.toString())
  }, [selectedSageId, activeTab])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeDrawer()
        closeFilters()
        closeComparator()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-search-input]')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDrawer, closeFilters, closeComparator])

  return (
    <div
      className="relative w-full h-dvh overflow-hidden bg-ink-900"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <Header locale={locale} otherLocale={otherLocale} />

      <main className="absolute inset-0 pt-[var(--header-h,64px)]">
        <CanvasArea activeTab={activeTab} locale={locale} />
      </main>

      {/* Mobile search overlay */}
      {isSearchOpen && (
        <div className="fixed inset-x-4 top-20 z-50 md:hidden animate-fade-in">
          <SearchBar locale={locale} />
        </div>
      )}

      <TabBar locale={locale} />
      <FAB locale={locale} />
      <ChatWidget locale={locale} />

      {/* Sage detail drawer */}
      <Drawer isOpen={isDrawerOpen && !!selectedSage} onClose={closeDrawer} locale={locale}>
        {selectedSage && (
          <SageCard sage={selectedSage} locale={locale} onClose={closeDrawer} />
        )}
      </Drawer>

      {/* Filters drawer */}
      <Drawer isOpen={isFiltersOpen} onClose={closeFilters} locale={locale}>
        <SageFilters locale={locale} onClose={closeFilters} />
      </Drawer>

      {/* Comparator overlay */}
      {isComparatorOpen && (
        <Comparator locale={locale} onClose={closeComparator} />
      )}

      {/* First-visit guided tour */}
      <OnboardingTour locale={locale} />
    </div>
  )
}

/* ── Canvas area ──────────────────────────────────────────────── */

function CanvasArea({ activeTab, locale }: { activeTab: string; locale: Locale }) {
  return (
    <div className="relative w-full h-full">
      {/* Network graph — always mounted so simulation lives across tab switches */}
      <div className={cn('absolute inset-0', activeTab === 'graph' ? 'block' : 'hidden')}>
        <NetworkGraph locale={locale} />
        <FilterChips locale={locale} />
      </div>

      {/* Geo map — lazy-mounted on first visit */}
      <div className={cn('absolute inset-0 isolate', activeTab === 'map' ? 'block' : 'hidden')}>
        <GeoMap locale={locale} />
        <FilterChips locale={locale} />
        <MapLegend locale={locale} />
      </div>

      {/* Traditions — era-grouped sage cards */}
      {activeTab === 'traditions' && (
        <div className="absolute inset-0">
          <Traditions locale={locale} />
        </div>
      )}

      {/* Timeline — D3 horizontal bands */}
      {activeTab === 'timeline' && (
        <div className="absolute inset-0">
          <Timeline locale={locale} />
        </div>
      )}

      {/* Sages table */}
      {activeTab === 'ideas' && (
        <div className="absolute inset-0">
          <SagesTable locale={locale} />
        </div>
      )}

      {/* Genealogy tree */}
      {activeTab === 'genealogy' && (
        <div className="absolute inset-0">
          <GenealogyTree locale={locale} />
        </div>
      )}

      {/* About page */}
      {activeTab === 'about' && <AboutContent locale={locale} />}
    </div>
  )
}

function TabPlaceholder({ icon, label, hint }: { icon: string; label: string; hint: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center select-none">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--ink-200) 1px, transparent 1px),
            linear-gradient(to bottom, var(--ink-200) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(201,151,58,0.04) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
        <span className="text-6xl font-mono text-gold-500/20 animate-pulse-gold" aria-hidden>
          {icon}
        </span>
        <h2 className="font-serif text-2xl font-bold text-ink-700">{label}</h2>
        <p className="font-sans text-xs text-ink-600 max-w-xs leading-relaxed">{hint}</p>
      </div>
    </div>
  )
}
```

## FILE: components/layout/Drawer.tsx

_(106 lines)_

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  locale: Locale
  children: React.ReactNode
  title?: string
  width?: string
}

export function Drawer({
  isOpen,
  onClose,
  locale,
  children,
  width = 'var(--drawer-w, 420px)',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Trap focus when open
  useEffect(() => {
    if (isOpen) {
      drawerRef.current?.focus()
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-300',
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(7, 5, 3, 0.55)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel — side on desktop, sheet on mobile */}
      <aside
        ref={drawerRef}
        tabIndex={-1}
        aria-hidden={!isOpen}
        role="complementary"
        className={cn(
          // Desktop: slide from end (right in RTL, left in LTR)
          'fixed top-0 end-0 bottom-0 z-50',
          'glass border-s border-gold-500/10',
          'outline-none',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'hidden md:flex flex-col',
          // Slide out toward the "end" edge: left in RTL (he), right in LTR
          isOpen
            ? 'translate-x-0'
            : locale === 'he' ? '-translate-x-[110%]' : 'translate-x-[110%]',
          // Closed drawer must never intercept clicks meant for the graph
          !isOpen && 'pointer-events-none invisible',
        )}
        style={{ width }}
      >
        {isOpen && children}
      </aside>

      {/* Mobile: bottom sheet */}
      <aside
        tabIndex={-1}
        aria-hidden={!isOpen}
        role="complementary"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'glass border-t border-gold-500/10 rounded-t-2xl',
          'outline-none',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'flex md:hidden flex-col',
          'h-[85dvh]',
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none invisible',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink-600" />
        </div>
        {isOpen && children}
      </aside>
    </>
  )
}
```

## FILE: components/layout/Header.tsx

_(278 lines)_

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SearchBar } from '@/components/ui/SearchBar'
import { useAppStore } from '@/store/useAppStore'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period } from '@/lib/types'
import { UI, LOCALES, LOCALE_NAMES, LOCALE_SHORT, tr } from '@/lib/i18n'
import { AuthStatus } from '@/components/auth/AuthStatus'

interface HeaderProps {
  locale: Locale
  otherLocale: Locale
}

const ERA_ORDER: Period[] = ALL_PERIODS

export function Header({ locale, otherLocale }: HeaderProps) {
  const t = UI[locale]
  const { totalSages, lastUpdate, openFilters, sages, connections } = useAppStore()
  const [showStats, setShowStats] = useState(false)

  const eraCounts = ERA_ORDER.map(era => ({
    era,
    count: sages.filter(s => s.period === era).length,
  })).filter(x => x.count > 0)
  const maxCount = Math.max(1, ...eraCounts.map(x => x.count))

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-30',
        'glass border-b border-gold-500/10',
        'px-4 md:px-6',
        'h-[var(--header-h,64px)]',
        'flex items-center gap-4',
      )}
    >
      {/* Logo */}
      <div className="flex-shrink-0 flex flex-col">
        <h1 className="font-serif text-xl font-bold text-gold-300 leading-none tracking-tight">
          {t.appTitle}
        </h1>
        <p className="font-sans text-[10px] text-ink-400 mt-0.5 hidden sm:block whitespace-nowrap">
          {t.appSubtitle}
        </p>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-ink-700/60 flex-shrink-0 hidden md:block" aria-hidden />

      {/* Search — center */}
      <div className="flex-1 min-w-0 hidden md:block" data-tour="search">
        <SearchBar locale={locale} />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 ms-auto flex-shrink-0" data-tour="header-actions">
        {/* Stats badge */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowStats(s => !s)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-sans',
              'glass-light border border-ink-600/40',
              'text-ink-300 hover:text-ink-100 hover:border-gold-500/30 transition-all',
            )}
          >
            <span className="text-gold-400 font-mono font-semibold">{totalSages.toLocaleString()}</span>
            <span className="text-ink-500">{tr(locale, 'חכמים', 'sages', 'мудрецов')}</span>
            {connections.length > 0 && (
              <>
                <span className="text-ink-700">·</span>
                <span className="text-ink-400 font-mono">{connections.length}</span>
                <span className="text-ink-500">{tr(locale, 'קשרים', 'links', 'связей')}</span>
              </>
            )}
            <span className="text-ink-600 text-[10px]">{showStats ? '▴' : '▾'}</span>
          </button>

          {showStats && eraCounts.length > 0 && (
            <div className="absolute top-full end-0 mt-2 w-60 glass rounded-xl border border-ink-700/50 p-3 z-50 shadow-glass-lg animate-fade-in">
              <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 mb-2">
                {tr(locale, 'לפי תקופה', 'By era', 'По эпохам')}
              </p>
              {eraCounts.map(({ era, count }) => {
                const color = ERA_COLORS[era]
                const pct = Math.round((count / maxCount) * 100)
                return (
                  <div key={era} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-sans text-ink-400 w-20 flex-shrink-0 truncate">
                      {ERA_LABELS[era]?.[locale]}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-mono text-ink-500 w-7 text-end">{count}</span>
                  </div>
                )
              })}
              {lastUpdate && (
                <p className="text-[9px] text-ink-700 mt-2 border-t border-ink-800 pt-1.5">
                  {tr(locale, 'עדכון: ', 'Updated: ', 'Обновлено: ')}{lastUpdate}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Advanced filter button */}
        <button
          onClick={openFilters}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans',
            'min-h-[44px] sm:min-h-0',
            'glass-light border border-ink-600/40',
            'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
            'transition-all duration-150',
          )}
          title={t.advancedSearch}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">{t.filtersLabel}</span>
        </button>

        {/* Theme toggle — כהה/בהיר (desktop) */}
        <button
          onClick={() => useAppStore.getState().toggleTheme()}
          className={cn(
            'hidden sm:block px-2.5 py-1.5 rounded-xl text-sm',
            'glass-light border border-ink-600/40',
            'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
            'transition-all duration-150',
          )}
          title={tr(locale, 'מצב כהה / בהיר', 'Dark / light mode', 'Тёмная / светлая тема')}
          aria-label={tr(locale, 'החלף ערכת נושא', 'Toggle theme', 'Переключить тему')}
        >
          <ThemeIcon />
        </button>

        {/* Guided tour re-launch (desktop) */}
        <button
          onClick={() => window.dispatchEvent(new Event('ozar-start-tour'))}
          className={cn(
            'hidden sm:block px-2.5 py-1.5 rounded-xl text-xs font-sans font-semibold',
            'glass-light border border-ink-600/40',
            'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
            'transition-all duration-150',
          )}
          title={tr(locale, 'סיור מודרך', 'Guided tour', 'Обучающий тур')}
          aria-label={tr(locale, 'הפעל סיור מודרך', 'Start guided tour', 'Начать тур')}
        >
          ?
        </button>

        {/* Auth status (desktop) */}
        <div className="hidden sm:block">
          <AuthStatus locale={locale} />
        </div>

        {/* Locale switcher (desktop) */}
        <LocaleSwitcher locale={locale} />

        {/* Mobile: collapsed actions menu (declutters the top bar) */}
        <MobileActionsMenu locale={locale} otherLocale={otherLocale} />
      </div>
    </header>
  )
}

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const others = LOCALES.filter(l => l !== locale)

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'px-3 py-1.5 rounded-xl text-xs font-sans font-medium',
          'glass-light border border-ink-600/40',
          'text-ink-300 hover:text-ink-100 hover:border-gold-500/30',
          'transition-all duration-150',
        )}
        title={LOCALE_NAMES[locale]}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {LOCALE_SHORT[locale]} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div role="menu" className="absolute top-full end-0 mt-2 w-36 z-50 glass rounded-xl border border-ink-700/50 shadow-glass-lg overflow-hidden animate-fade-in">
            {others.map(l => (
              <Link
                key={l}
                href={`/${l}`}
                role="menuitem"
                className="block px-4 py-2.5 text-sm font-sans text-ink-200 hover:bg-ink-700/50 transition-colors"
                onClick={() => setOpen(false)}
              >
                {LOCALE_NAMES[l]}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MobileActionsMenu({ locale, otherLocale }: { locale: Locale; otherLocale: Locale }) {
  const [open, setOpen] = useState(false)
  const isHe = locale === 'he'
  const theme = useAppStore(s => s.theme)

  const item = cn(
    'flex items-center gap-3 w-full px-4 py-3 min-h-[44px] text-start text-sm font-sans',
    'text-ink-200 hover:bg-ink-700/50 transition-colors',
  )

  return (
    <div className="relative sm:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-lg',
          'glass-light border border-ink-600/40',
          'text-ink-300 hover:text-ink-100 transition-all',
        )}
        aria-label={isHe ? 'תפריט פעולות' : 'Actions menu'}
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full end-0 mt-2 w-52 z-50 glass rounded-xl border border-ink-700/50 shadow-glass-lg overflow-hidden animate-fade-in">
            <button className={item}
              onClick={() => { useAppStore.getState().toggleTheme(); setOpen(false) }}>
              <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
              {isHe ? 'מצב כהה / בהיר' : 'Dark / light mode'}
            </button>
            <button className={cn(item, 'border-t border-ink-700/40')}
              onClick={() => { window.dispatchEvent(new Event('ozar-start-tour')); setOpen(false) }}>
              <span aria-hidden>❔</span>
              {isHe ? 'סיור מודרך' : 'Guided tour'}
            </button>
            {LOCALES.filter(l => l !== locale).map(l => (
              <Link key={l} href={`/${l}`} className={cn(item, 'border-t border-ink-700/40')}>
                <span aria-hidden>🌐</span>
                {LOCALE_NAMES[l]}
              </Link>
            ))}
            <div className="border-t border-ink-700/40 px-4 py-3">
              <AuthStatus locale={locale} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}


function ThemeIcon() {
  const theme = useAppStore(s => s.theme)
  return <span aria-hidden>{theme === 'dark' ? '☀️' : '🌙'}</span>
}
```

## FILE: components/layout/TabBar.tsx

_(81 lines)_

```tsx
'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { TAB_META } from '@/lib/types'
import type { Tab, Locale } from '@/lib/types'

const TABS: Tab[] = ['graph', 'map', 'traditions', 'ideas', 'timeline', 'genealogy', 'about']

interface TabBarProps {
  locale: Locale
}

export function TabBar({ locale }: TabBarProps) {
  const { activeTab, setActiveTab } = useAppStore()
  const isHe = locale === 'he'

  return (
    <nav
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-30',
        'glass rounded-2xl px-2 py-1.5',
        'shadow-glass flex items-center gap-0.5',
        'max-w-[calc(100vw-2rem)]',
      )}
      aria-label={isHe ? 'ניווט ראשי' : 'Main navigation'}
      data-tour="tabs"
    >
      {TABS.map(tab => {
        const meta   = TAB_META[tab]
        const label  = isHe ? meta.labelHe : locale === 'ru' ? meta.labelRu : meta.labelEn
        const active = activeTab === tab

        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl',
              'transition-all duration-200 min-w-[64px] min-h-[44px]',
              active
                ? 'bg-gold-500/20 text-gold-300 shadow-gold-glow border border-gold-500/40'
                : 'border border-transparent text-ink-400 hover:text-ink-200 hover:bg-ink-700/40',
            )}
          >
            {meta.icon === 'temple' ? (
              <img
                src="/icons/temple.svg"
                alt={label}
                className={cn(
                  'w-6 h-6',
                  active ? '[filter:drop-shadow(0_0_4px_#c99a3a)]' : '',
                )}
                aria-hidden
              />
            ) : (
              <span
                className="text-base leading-none"
                style={{ fontFamily: 'monospace' }}
                aria-hidden
              >
                {meta.icon}
              </span>
            )}
            <span
              className={cn(
                'text-[10px] font-sans font-medium leading-tight whitespace-nowrap',
                active ? 'text-gold-300' : 'text-ink-500',
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
```

## FILE: components/providers/LocaleProvider.tsx

_(22 lines)_

```tsx
'use client'

import { useEffect } from 'react'
import { getDirection, getHtmlLang } from '@/lib/i18n'
import type { Locale } from '@/lib/types'

interface LocaleProviderProps {
  locale: Locale
  children: React.ReactNode
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  useEffect(() => {
    const dir  = getDirection(locale)
    const lang = getHtmlLang(locale)
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', dir)
  }, [locale])

  return <>{children}</>
}
```

## FILE: components/sages/ResearchSection.tsx

_(99 lines)_

```tsx
'use client'

// מדור "מחקר מלא" בדף החכם — נטען בצד הלקוח מ-/research/<id>.json
// (עובד זהה בלוקאל וב-Vercel; הקבצים סטטיים ב-public/research)
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/types'
import { ReadingControls, useReadingPrefs, readingStyle } from '@/components/ui/ReadingControls'
import { tr } from '@/lib/i18n'

interface ResearchDoc {
  title: string
  source_file: string
  word_count: number
  content: string
}

export function ResearchSection({ sageId, locale }: { sageId: string; locale: Locale }) {
  const [docs, setDocs] = useState<ResearchDoc[] | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [prefs, setPrefs] = useReadingPrefs()
  const isHe = locale === 'he'

  // Localized research: /research/<id>.<locale>.json (generated by the
  // Character Factory translate_research script), falling back to the
  // canonical Hebrew /research/<id>.json when no translation exists yet.
  useEffect(() => {
    let alive = true
    const fetchDocs = async () => {
      if (locale !== 'he') {
        try {
          const r = await fetch(`/research/${sageId}.${locale}.json`)
          if (r.ok) {
            const d = await r.json()
            if (alive) { setDocs(Array.isArray(d) ? d : []); setIsFallback(false) }
            return
          }
        } catch { /* fall through to Hebrew */ }
      }
      try {
        const r = await fetch(`/research/${sageId}.json`)
        const d = r.ok ? await r.json() : []
        if (alive) { setDocs(Array.isArray(d) ? d : []); setIsFallback(locale !== 'he') }
      } catch {
        if (alive) setDocs([])
      }
    }
    fetchDocs()
    return () => { alive = false }
  }, [sageId, locale])

  if (docs === null) {
    return (
      <p className="text-xs font-sans text-ink-500 animate-pulse">
        {tr(locale, 'טוען מחקר…', 'Loading research…', 'Загрузка исследования…')}
      </p>
    )
  }
  if (docs.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500">
          {isHe
            ? `מחקר מלא (${docs.length} ${docs.length === 1 ? 'מסמך' : 'מסמכים'})`
            : locale === 'ru'
              ? `Полное исследование (${docs.length} док.)`
              : `Full Research (${docs.length} ${docs.length === 1 ? 'document' : 'documents'})`}
        </h2>
        <ReadingControls prefs={prefs} onChange={setPrefs} locale={locale} />
      </div>
      {isFallback && (
        <p className="text-[11px] font-sans text-ink-500 mb-2">
          {locale === 'ru'
            ? 'Исследование пока доступно только на иврите.'
            : 'Research is currently available in Hebrew only.'}
        </p>
      )}
      <div className="space-y-3" dir={isFallback || isHe ? 'rtl' : 'ltr'}>
        {docs.map((doc, i) => (
          <details key={i} open={i === 0}
            className="rounded-xl border border-ink-700/40 bg-ink-800/30 overflow-hidden">
            <summary className="cursor-pointer select-none px-4 py-3 font-serif text-sm text-gold-300 hover:bg-ink-700/30 transition-colors">
              📖 {doc.title.length > 90 ? doc.title.slice(0, 90) + '…' : doc.title}
              <span className="text-ink-500 text-xs font-sans"> · {doc.word_count.toLocaleString()} {tr(locale, 'מילים', 'words', 'слов')}</span>
            </summary>
            <div
              className="px-4 pb-4 pt-1 text-sm text-ink-200 whitespace-pre-line border-t border-ink-700/30"
              style={readingStyle(prefs)}
            >
              {doc.content}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
```

## FILE: components/sages/SageCard.tsx

_(528 lines)_

```tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatYearRange } from '@/lib/utils'
import { EraChip } from '@/components/ui/EraChip'
import { CONNECTION_LABELS, ERA_COLORS } from '@/lib/types'
import type { Sage, Connection, Locale } from '@/lib/types'
import { UI, tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import { fetchResearchContent } from '@/lib/supabase'
import { ReadingControls, useReadingPrefs, readingStyle } from '@/components/ui/ReadingControls'
import { SageMiniMap } from '@/components/sages/SageMiniMap'
import { resolveCoords } from '@/lib/locationCoords'
import { currentUser, loadSageMemory, recordSageView, saveSageNote, setSageBookmark } from '@/lib/personal'

interface SageCardProps {
  sage: Sage
  locale: Locale
  onClose: () => void
}

export function SageCard({ sage, locale, onClose }: SageCardProps) {
  const t = UI[locale]
  const { connections, sageMap, selectSage, openComparator, setActiveTab, activeTab } = useAppStore()
  const [research, setResearch] = useState<string | null>(null)
  const [researchOpen, setResearchOpen] = useState(false)
  const [readingPrefs, setReadingPrefs] = useReadingPrefs()
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [note, setNote] = useState('')
  const [memoryMessage, setMemoryMessage] = useState('')

  useEffect(() => {
    setResearch(null)
    setResearchOpen(false)
    // Localized research first (/research/<id>.<locale>.json, generated by
    // translate_research.py), then Supabase Hebrew as fallback
    const load = async () => {
      if (locale !== 'he') {
        try {
          const r = await fetch(`/research/${sage.id}.${locale}.json`)
          if (r.ok) {
            const docs = await r.json()
            if (Array.isArray(docs) && docs.length) {
              setResearch(docs.map((d: { content?: string }) => d.content ?? '').join('\n\n'))
              return
            }
          }
        } catch { /* fall back to Hebrew */ }
      }
      fetchResearchContent(sage.id).then(setResearch)
    }
    load()
  }, [sage.id, locale])

  useEffect(() => {
    let active = true
    currentUser().then(async user => {
      if (!active || !user) return
      setUserId(user.id)
      const memory = await loadSageMemory(user.id, sage.id)
      if (!active) return
      setBookmarked(memory.bookmarked)
      setNote(memory.note)
      await recordSageView(user.id, sage.id)
    })
    return () => { active = false }
  }, [sage.id])

  async function toggleBookmark() {
    if (!userId) return
    const next = !bookmarked
    const { error } = await setSageBookmark(userId, sage.id, next)
    if (!error) setBookmarked(next)
    setMemoryMessage(error ? error.message : tr(locale, 'נשמר', 'Saved', 'Сохранено'))
  }

  async function persistNote() {
    if (!userId || !note.trim()) return
    const { error } = await saveSageNote(userId, sage.id, note)
    setMemoryMessage(error ? error.message : tr(locale, 'ההערה נשמרה', 'Note saved', 'Заметка сохранена'))
  }

  const sageConnections: Array<Connection & { otherSage: Sage | undefined }> =
    connections
      .filter(c => c.source === sage.id || c.target === sage.id)
      .map(c => {
        const otherId = c.source === sage.id ? c.target : c.source
        return { ...c, otherSage: sageMap.get(otherId) }
      })
      .filter(c => c.otherSage)
      .slice(0, 12)

  const accentColor = ERA_COLORS[sage.period] ?? '#c9973a'
  const yearRange   = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <article className="flex flex-col h-full overflow-hidden">
      {/* Hero header */}
      <header
        className="relative px-6 pt-8 pb-6 flex-shrink-0"
        style={{
          background: `linear-gradient(to bottom, ${accentColor}18 0%, transparent 100%)`,
          borderBottom: `1px solid ${accentColor}22`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-ink-500 hover:text-ink-100 transition-colors p-1.5 rounded-lg hover:bg-ink-700/50"
          aria-label={t.close}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Era chip */}
        <EraChip period={sage.period} locale={locale} className="mb-3" />

        {/* Name */}
        <h1 className="font-serif text-2xl font-bold text-ink-50 leading-tight">
          {sage.label}
        </h1>
        {sage.name_en && (
          <p className="font-sans text-sm text-ink-300 mt-1">{sage.name_en}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
          {yearRange && (
            <span className="text-xs font-sans text-ink-400">
              {yearRange}
            </span>
          )}
          {sage.location && (
            <>
              <span className="text-ink-700" aria-hidden>·</span>
              <span className="flex items-center gap-1 text-xs font-sans text-ink-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {sage.location}
              </span>
            </>
          )}
          {sage.field && (
            <>
              <span className="text-ink-700" aria-hidden>·</span>
              <span className="text-xs font-sans text-ink-400">{sage.field}</span>
            </>
          )}
        </div>

        {/* Tags */}
        {sage.tags && sage.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sage.tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs font-sans bg-ink-700/60 text-ink-300 border border-ink-600/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Cross-view sync: jump to this sage in other tabs */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {activeTab !== 'graph' && (
            <CrossViewBtn onClick={() => setActiveTab('graph')} icon="⬡"
              label={tr(locale, 'הצג ברשת', 'Show in network', 'Показать в сети')} />
          )}
          {activeTab !== 'map' && (
            <CrossViewBtn onClick={() => setActiveTab('map')} icon="◎"
              label={tr(locale, 'הצג במפה', 'Show on map', 'Показать на карте')} />
          )}
          {activeTab !== 'timeline' && (
            <CrossViewBtn onClick={() => setActiveTab('timeline')} icon="▷"
              label={tr(locale, 'הצג בציר הזמן', 'Show on timeline', 'Показать на хронологии')} />
          )}
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Core concept */}
        {sage.core_concept && (
          <section>
            <SectionLabel>{t.coreConcept}</SectionLabel>
            <blockquote
              className="border-s-2 ps-4 py-1 italic text-sm text-ink-200 font-serif leading-relaxed"
              style={{ borderColor: accentColor }}
            >
              {sage.core_concept}
            </blockquote>
          </section>
        )}

        {/* Biography */}
        {sage.bio && (
          <section>
            <SectionLabel>{t.biography}</SectionLabel>
            <p className="text-sm font-sans text-ink-200 leading-relaxed">
              {sage.bio}
            </p>
          </section>
        )}

        {/* Works — each links to Sefaria (Sage Dossier: works list) */}
        {sage.works && sage.works.length > 0 && (
          <section>
            <SectionLabel>{t.works}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {sage.works.map(work => (
                <a
                  key={work}
                  href={`https://www.sefaria.org/search?q=${encodeURIComponent(work)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans',
                    'bg-ink-800/60 hover:bg-ink-700/70 text-ink-200 hover:text-gold-300',
                    'border border-ink-700/40 hover:border-gold-500/30',
                    'transition-all duration-150',
                  )}
                >
                  <span aria-hidden>📖</span>
                  {work}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Research content (lazy-loaded from Supabase) */}
        {research && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-1">
              <button
                onClick={() => setResearchOpen(o => !o)}
                className="flex items-center gap-2 text-start group"
              >
                <SectionLabel>
                  {tr(locale, 'מחקר מורחב', 'Research', 'Исследование')}
                </SectionLabel>
                <span className="text-ink-600 text-xs mb-2">{researchOpen ? '▾' : '▸'}</span>
              </button>
              {researchOpen && (
                <ReadingControls prefs={readingPrefs} onChange={setReadingPrefs} locale={locale} />
              )}
            </div>
            {researchOpen && (
              <p
                className="text-sm text-ink-300 whitespace-pre-wrap"
                style={readingStyle(readingPrefs)}
              >
                {research}
              </p>
            )}
          </section>
        )}

        {/* Location mini-map (Sage Dossier) */}
        {resolveCoords(sage) && (
          <section>
            <SectionLabel>{tr(locale, 'מיקום', 'Location', 'Местоположение')}</SectionLabel>
            <SageMiniMap sage={sage} locale={locale} />
          </section>
        )}

        {/* Migration path */}
        {sage.migration_path && (
          <section>
            <SectionLabel>{t.migrationPath}</SectionLabel>
            <MigrationViz path={sage.migration_path} />
          </section>
        )}

        {/* Related sages */}
        {sageConnections.length > 0 && (
          <section>
            <SectionLabel>{t.relatedSages} ({sageConnections.length})</SectionLabel>
            <ul className="space-y-1.5">
              {sageConnections.map((conn, idx) => {
                const other = conn.otherSage!
                const connType = conn.type
                const connLabel = CONNECTION_LABELS[connType]?.[locale] ?? connType
                const isSource = conn.source === sage.id
                const otherColor = ERA_COLORS[other.period] ?? '#7a6550'

                return (
                  <li key={idx}>
                    <button
                      onClick={() => selectSage(other)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-start',
                        'bg-ink-800/40 hover:bg-ink-700/50 border border-ink-700/40',
                        'transition-colors group',
                      )}
                    >
                      <span
                        className="era-dot flex-shrink-0"
                        style={{ background: otherColor }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate block">
                          {other.label}
                        </span>
                        {other.name_en && (
                          <span className="text-xs font-sans text-ink-400 truncate block">
                            {other.name_en}
                          </span>
                        )}
                      </span>
                      <span
                        className="text-xs font-sans px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}33`,
                        }}
                      >
                        {isSource ? '← ' : ''}{connLabel}{!isSource ? ' →' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Personal memory — protected by Supabase RLS */}
        {userId && (
          <section>
            <SectionLabel>{tr(locale, 'הזיכרון שלי', 'My notes', 'Мои заметки')}</SectionLabel>
            <div className="space-y-2">
              <button
                onClick={toggleBookmark}
                className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-xs text-gold-300"
              >
                {bookmarked
                  ? tr(locale, '★ הסר מסימניות', '★ Remove bookmark', '★ Удалить закладку')
                  : tr(locale, '☆ שמור בסימניות', '☆ Add bookmark', '☆ Добавить закладку')}
              </button>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder={tr(locale, 'הערה אישית על החכם...', 'A private note about this sage...', 'Личная заметка о мудреце...')}
                className="min-h-24 w-full resize-y rounded-lg border border-ink-600/50 bg-ink-900/60 p-3 text-sm text-ink-200 outline-none focus:border-gold-500/40"
              />
              <div className="flex items-center gap-3">
                <button onClick={persistNote} className="text-xs text-gold-300 hover:text-gold-200">
                  {tr(locale, 'שמור הערה', 'Save note', 'Сохранить заметку')}
                </button>
                {memoryMessage && <span className="text-xs text-ink-500">{memoryMessage}</span>}
              </div>
            </div>
          </section>
        )}

        {/* External links */}
        <section>
          <SectionLabel>{t.externalLinks}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {sage.spotify_url && (
              <a
                href={sage.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition-all duration-150 border"
                style={{ background: '#1DB95418', borderColor: '#1DB95444', color: '#1DB954' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                {tr(locale, 'פודקאסט', 'Podcast', 'Подкаст')}
              </a>
            )}
            <ExternalLink
              href={`https://www.sefaria.org/search#${encodeURIComponent(sage.name_en ?? sage.label)}`}
              label="Sefaria"
              icon="📜"
            />
            <ExternalLink
              href={`https://he.wikipedia.org/wiki/${encodeURIComponent(sage.label)}`}
              label="ויקיפדיה"
              icon="📖"
            />
            <ExternalLink
              href={`https://www.nli.org.il/find/books?query=${encodeURIComponent(sage.label)}`}
              label="הספרייה הלאומית"
              icon="🏛"
            />
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <footer className="flex-shrink-0 px-6 py-4 border-t border-ink-700/40 flex gap-2">
        {/* Full detail page link */}
        <Link
          href={`/${locale}/sage/${sage.id}`}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-sans font-medium text-center',
            'border transition-all duration-200 hover:shadow-gold-glow',
          )}
          style={{
            background: `${accentColor}18`,
            borderColor: `${accentColor}44`,
            color: accentColor,
          }}
        >
          {tr(locale, 'דף מלא', 'Full Profile', 'Полный профиль')}
        </Link>

        {/* Compare button */}
        <button
          onClick={() => openComparator(sage)}
          aria-label={tr(locale, 'השווה', 'Compare', 'Сравнить')}
          title={tr(locale, 'השווה עם חכם אחר', 'Compare with another sage', 'Сравнить с другим мудрецом')}
          className="px-3 py-2.5 rounded-xl border border-ink-700/40 text-ink-400 hover:text-gold-300 hover:border-gold-500/40 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        {/* Print */}
        <button
          aria-label={t.exportPDF}
          className="px-3 py-2.5 rounded-xl border border-ink-700/40 text-ink-400 hover:text-ink-200 hover:border-ink-600/60 transition-all"
          onClick={() => window.print()}
          title={t.exportPDF}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
      </footer>
    </article>
  )
}

function CrossViewBtn({ onClick, icon, label }: {
  onClick: () => void; icon: string; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans',
        'bg-ink-800/50 hover:bg-ink-700/60 text-ink-300 hover:text-gold-300',
        'border border-ink-700/40 hover:border-gold-500/30',
        'transition-all duration-150',
      )}
    >
      <span className="font-mono text-[11px]" aria-hidden>{icon}</span>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500 mb-2">
      {children}
    </p>
  )
}

function MigrationViz({ path }: { path: NonNullable<Sage['migration_path']> }) {
  const stops = [path.from, ...(path.intermediate ?? []), path.to]

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stops.map((stop, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <span
            className={cn(
              'px-2 py-1 rounded text-xs font-sans',
              idx === 0 || idx === stops.length - 1
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'bg-ink-700/50 text-ink-300 border border-ink-600/40',
            )}
          >
            {stop}
          </span>
          {idx < stops.length - 1 && (
            <svg className="w-3 h-3 text-ink-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

function ExternalLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans',
        'bg-ink-800/60 hover:bg-ink-700/70 text-ink-300 hover:text-ink-100',
        'border border-ink-700/40 hover:border-ink-600/60',
        'transition-all duration-150',
      )}
    >
      <span>{icon}</span>
      {label}
    </a>
  )
}
```

## FILE: components/sages/SageFilters.tsx

_(174 lines)_

```tsx
'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { ERA_LABELS, ERA_COLORS, REGION_LABELS, REGION_COLORS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { UI, tr } from '@/lib/i18n'

const PERIODS: Period[] = ALL_PERIODS

const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach', 'other',
]

interface SageFiltersProps {
  locale: Locale
  onClose: () => void
}

export function SageFilters({ locale, onClose }: SageFiltersProps) {
  const t = UI[locale]
  const { filters, togglePeriodFilter, toggleRegionFilter, toggleFieldFilter, clearFilters, filteredSages, sages, availableFields } = useAppStore()

  const hasActiveFilters = filters.period.length > 0 || filters.region.length > 0 || filters.field.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/50">
        <h2 className="font-serif text-lg font-semibold text-ink-100">
          {t.advancedSearch}
        </h2>
        <button
          onClick={onClose}
          className="text-ink-400 hover:text-ink-100 transition-colors p-1 rounded"
          aria-label={t.close}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Results count */}
        <div className="text-sm text-ink-400 font-sans">
          {filteredSages.length.toLocaleString('he-IL')} / {sages.length.toLocaleString('he-IL')}{' '}
          {t.sagesLoaded}
        </div>

        {/* Period filter */}
        <div>
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
            {t.period}
          </p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map(period => {
              const label  = ERA_LABELS[period]?.[locale] ?? period
              const color  = ERA_COLORS[period]
              const active = filters.period.includes(period)

              return (
                <button
                  key={period}
                  onClick={() => togglePeriodFilter(period)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all',
                    active
                      ? 'border-2'
                      : 'border border-opacity-40 opacity-60 hover:opacity-100',
                  )}
                  style={{
                    background: active ? `${color}22` : 'transparent',
                    borderColor: color,
                    color: active ? color : 'var(--ink-300)',
                  }}
                >
                  <span
                    className="era-dot"
                    style={{ background: color, width: 6, height: 6 }}
                  />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Region filter */}
        <div>
          <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
            {tr(locale, 'אזור גיאוגרפי', 'Region', 'Регион')}
          </p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(region => {
              const label  = REGION_LABELS[region]?.[locale] ?? region
              const color  = REGION_COLORS[region]
              const active = filters.region.includes(region)

              return (
                <button
                  key={region}
                  onClick={() => toggleRegionFilter(region)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans transition-all',
                    active
                      ? 'border-2'
                      : 'border border-opacity-40 opacity-60 hover:opacity-100',
                  )}
                  style={{
                    background: active ? `${color}22` : 'transparent',
                    borderColor: color,
                    color: active ? color : 'var(--ink-300)',
                  }}
                >
                  <span
                    className="era-dot"
                    style={{ background: color, width: 6, height: 6 }}
                  />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        {/* Field filter */}
        {availableFields.length > 0 && (
          <div>
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-400 mb-3">
              {tr(locale, 'תחום', 'Field', 'Область')}
            </p>
            <div className="flex flex-wrap gap-2">
              {availableFields.map(field => {
                const active = filters.field.includes(field)
                return (
                  <button
                    key={field}
                    onClick={() => toggleFieldFilter(field)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-sans transition-all border',
                      active
                        ? 'bg-gold-500/20 border-gold-500/60 text-gold-300'
                        : 'border-ink-600/40 text-ink-400 hover:text-ink-200 hover:border-ink-500/60',
                    )}
                  >
                    {field}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {hasActiveFilters && (
        <div className="px-5 py-4 border-t border-ink-700/50">
          <button
            onClick={clearFilters}
            className={cn(
              'w-full py-2 rounded-lg text-sm font-sans font-medium',
              'bg-ink-700/50 text-ink-300 hover:bg-ink-700 transition-colors',
            )}
          >
            {t.clearFilters}
          </button>
        </div>
      )}
    </div>
  )
}
```

## FILE: components/sages/SageMiniMap.tsx

_(128 lines)_

```tsx
'use client'

// Sage Dossier mini-map — small static Leaflet snippet showing the sage's
// primary location + migration stops. Non-interactive by design (the full
// Geography tab is one click away via the cross-view button).
import { useEffect, useRef } from 'react'
import type { Sage, Locale } from '@/lib/types'
import { ERA_COLORS } from '@/lib/types'
import { resolveCoords, coordsForName } from '@/lib/locationCoords'

interface SageMiniMapProps {
  sage: Sage
  locale: Locale
}

export function SageMiniMap({ sage, locale }: SageMiniMapProps) {
  const holderRef = useRef<HTMLDivElement>(null)
  const mapRef    = useRef<import('leaflet').Map | null>(null)

  const primary = resolveCoords(sage)

  useEffect(() => {
    if (!primary || !holderRef.current) return
    let mounted = true

    // Leaflet CSS (once per page)
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link')
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    import('leaflet').then(L => {
      if (!mounted || !holderRef.current || mapRef.current) return

      const isLight = document.documentElement.dataset.theme === 'light'
      const map = L.map(holderRef.current, {
        center: [primary.lat, primary.lng],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      })
      mapRef.current = map

      L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/${isLight ? 'light_nolabels' : 'dark_nolabels'}/{z}/{x}/{y}{r}.png`,
        { maxZoom: 18 },
      ).addTo(map)

      const accent = ERA_COLORS[sage.period] ?? '#c9973a'

      // Migration stops (from → intermediate → to), resolved to coords
      const stops: Array<{ lat: number; lng: number }> = []
      if (sage.migration_path) {
        const names = [
          sage.migration_path.from,
          ...(sage.migration_path.intermediate ?? []),
          sage.migration_path.to,
        ]
        for (const name of names) {
          const c = coordsForName(name)
          if (c) stops.push(c)
        }
      }

      if (stops.length >= 2) {
        L.polyline(stops.map(s => [s.lat, s.lng]), {
          color: accent,
          weight: 2,
          opacity: 0.7,
          dashArray: '6 4',
        }).addTo(map)
        stops.forEach((s, i) => {
          L.circleMarker([s.lat, s.lng], {
            radius: i === 0 || i === stops.length - 1 ? 5 : 3.5,
            color: accent,
            fillColor: accent,
            fillOpacity: 0.85,
            weight: 1,
          }).addTo(map)
        })
        map.fitBounds(L.latLngBounds(stops.map(s => [s.lat, s.lng] as [number, number])), {
          padding: [24, 24],
          maxZoom: 6,
        })
      } else {
        L.circleMarker([primary.lat, primary.lng], {
          radius: 7,
          color: accent,
          fillColor: accent,
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(map)
      }
    })

    return () => {
      mounted = false
      mapRef.current?.remove()
      mapRef.current = null
    }
    // Re-init per sage — coords derive from sage
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sage.id])

  if (!primary) return null

  return (
    <div
      ref={holderRef}
      className="w-full h-36 rounded-xl overflow-hidden border border-ink-700/40"
      role="img"
      aria-label={
        locale === 'he'
          ? `מפה: ${sage.location ?? ''}`
          : `Map: ${sage.location ?? ''}`
      }
    />
  )
}
```

## FILE: components/ui/Badge.tsx

_(46 lines)_

```tsx
'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  total: number
  lastUpdate: string
  locale?: 'he' | 'en'
  className?: string
}

export function DataBadge({ total, lastUpdate, locale = 'he', className }: BadgeProps) {
  const isHe = locale === 'he'

  if (!total) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        'text-xs font-sans font-medium',
        'bg-ink-800/60 border border-ink-600/40',
        'text-ink-300',
        className,
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse"
        aria-hidden
      />
      <span>
        {total.toLocaleString('he-IL')}{' '}
        {isHe ? 'חכמים' : 'sages'}
      </span>
      {lastUpdate && (
        <>
          <span className="text-ink-600">·</span>
          <span className="text-ink-400">
            {isHe ? `עדכון: ${lastUpdate}` : `Updated: ${lastUpdate}`}
          </span>
        </>
      )}
    </div>
  )
}
```

## FILE: components/ui/EmptyState.tsx

_(95 lines)_

```tsx
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import { tr } from '@/lib/i18n'

interface EmptyStateProps {
  locale: Locale
  title?: string
  description?: string
  icon?: 'filter' | 'search' | 'network' | 'map' | 'calendar'
  action?: {
    label: string
    onClick: () => void
  }
}

const ICONS = {
  filter: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  search: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  network: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.5a1 1 0 00-.8.4l-4.5 5.6a1 1 0 00.8 1.6h2.5" />
    </svg>
  ),
  map: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6.553 3.276A1 1 0 0021 20.382V9.618a1 1 0 00-1.447-.894L15 11m0 13V11m0 0L9 7" />
    </svg>
  ),
  calendar: (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

export function EmptyState({
  locale,
  title,
  description,
  icon = 'filter',
  action
}: EmptyStateProps) {
  const isHe = locale === 'he'
  const defaultTitle = isHe ? 'אין חכמים התואמים' : 'No sages found'
  const defaultDescription = isHe
    ? 'לא נמצאו חכמים התואמים לפילטרים הנוכחיים. נסה להחליף את בחירתך או לאפס את הפילטרים.'
    : 'No sages match your current filters. Try changing your selection or resetting filters.'

  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'py-12 px-4',
      'text-center'
    )}>
      {/* Icon */}
      <div className="mb-4 text-ink-500/60">
        {ICONS[icon]}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-ink-200 mb-2">
        {title || defaultTitle}
      </h3>

      {/* Description */}
      <p className="text-sm text-ink-400 max-w-sm mb-6 leading-relaxed">
        {description || defaultDescription}
      </p>

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'px-4 py-2 rounded-lg',
            'bg-ink-700 hover:bg-ink-600',
            'text-ink-100 text-sm font-medium',
            'transition-colors'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

## FILE: components/ui/EraChip.tsx

_(39 lines)_

```tsx
'use client'

import { cn } from '@/lib/utils'
import { ERA_LABELS, ERA_COLORS } from '@/lib/types'
import type { Period, Locale } from '@/lib/types'

interface EraChipProps {
  period: Period
  locale?: Locale
  size?: 'sm' | 'md'
  className?: string
}

export function EraChip({ period, locale = 'he', size = 'md', className }: EraChipProps) {
  const label  = ERA_LABELS[period]?.[locale] ?? period
  const color  = ERA_COLORS[period] ?? '#7a6550'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-sans font-medium tracking-wide',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs',
        className,
      )}
      style={{
        background: `${color}1a`,
        border: `1px solid ${color}55`,
        color,
      }}
    >
      <span
        className="era-dot"
        style={{ background: color, width: 6, height: 6 }}
      />
      {label}
    </span>
  )
}
```

## FILE: components/ui/FAB.tsx

_(52 lines)_

```tsx
'use client'

import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { Locale } from '@/lib/types'

interface FABProps {
  locale?: Locale
  className?: string
}

const LABELS: Record<Locale, { open: string; close: string }> = {
  he: { open: 'חיפוש חכמים', close: 'סגור חיפוש' },
  en: { open: 'Search sages', close: 'Close search' },
  ru: { open: 'Поиск мудрецов', close: 'Закрыть поиск' },
}

export function FAB({ locale = 'he', className }: FABProps) {
  const { toggleSearch, isSearchOpen } = useAppStore()
  const t = LABELS[locale]

  return (
    <button
      onClick={toggleSearch}
      aria-label={isSearchOpen ? t.close : t.open}
      title={isSearchOpen ? t.close : t.open}
      className={cn(
        'fixed bottom-20 end-4 z-40',
        'w-14 h-14 rounded-full',
        'glass border border-gold-500/30',
        'flex items-center justify-center',
        'shadow-gold-glow transition-all duration-200',
        'hover:border-gold-400/60 hover:scale-105 active:scale-95',
        'md:hidden',
        isSearchOpen && 'border-gold-400/60 bg-ink-700/80',
        className,
      )}
    >
      {isSearchOpen ? (
        <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )}
    </button>
  )
}
```

## FILE: components/ui/OnboardingTour.tsx

_(210 lines)_

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import type { Locale } from '@/lib/types'

const STORAGE_KEY = 'ozar-tour-v1'

interface TourStep {
  /** CSS selector of the element to spotlight; null = centered card */
  target: string | null
  title: Record<Locale, string>
  body:  Record<Locale, string>
}

const STEPS: TourStep[] = [
  {
    target: null,
    title: { he: 'ברוכים הבאים לאוצר חכמים', en: 'Welcome to Ozar Chachamim', ru: 'Добро пожаловать в Оцар Хахамим' },
    body: {
      he: 'מפת הידע האינטראקטיבית של חכמי ישראל לדורותיהם — רשת קשרים, מפה גיאוגרפית, ציר זמן ועוד. סיור קצר של דקה יראה לכם את העיקר.',
      en: 'The interactive knowledge map of Jewish sages across the generations — a connection network, geographic map, timeline and more. A one-minute tour shows you the essentials.',
      ru: 'Интерактивная карта знаний еврейских мудрецов всех поколений — сеть связей, географическая карта, хронология и многое другое. Минутный тур покажет главное.',
    },
  },
  {
    target: '[data-tour="search"]',
    title: { he: 'חיפוש חכם', en: 'Smart search', ru: 'Умный поиск' },
    body: {
      he: 'הקלידו שם, תקופה או מקום. החיפוש סלחני לכתיב — "רמבם" ימצא את הרמב״ם. אפשר גם Ctrl+K.',
      en: 'Type a name, era or place. Search is spelling-tolerant — "rambam" finds Maimonides. Ctrl+K works too.',
      ru: 'Введите имя, эпоху или место. Поиск терпим к написанию — «рамбам» найдёт Маймонида. Работает и Ctrl+K.',
    },
  },
  {
    target: '[data-tour="tabs"]',
    title: { he: 'שש תצוגות', en: 'Six views', ru: 'Шесть представлений' },
    body: {
      he: 'רשת קשרים, גיאוגרפיה, מסורות, טבלה, שלשלת הקבלה ועץ שושלות. בחירת חכם באחת התצוגות תסומן גם בשאר.',
      en: 'Network, geography, traditions, table, timeline and lineage tree. Selecting a sage in one view highlights it in the others.',
      ru: 'Сеть, география, традиции, таблица, хронология и древо династий. Выбор мудреца в одном виде подсвечивает его в остальных.',
    },
  },
  {
    target: '[data-tour="legend"]',
    title: { he: 'מקרא וצבעים', en: 'Legend & colors', ru: 'Легенда и цвета' },
    body: {
      he: 'צבעי הצמתים לפי תקופה או אזור, וסוגי הקשרים לפי סגנון הקו. לחיצה על צומת פותחת תיק חכם מלא; לחיצה על קו מציגה את מהות הקשר.',
      en: 'Node colors follow era or region; line styles encode connection types. Click a node for the full sage dossier; click an edge to see the relationship.',
      ru: 'Цвета узлов — по эпохе или региону; стили линий — типы связей. Клик по узлу открывает досье мудреца; клик по линии — характер связи.',
    },
  },
  {
    target: '[data-tour="header-actions"]',
    title: { he: 'סינון, ערכת נושא ושפה', en: 'Filters, theme & language', ru: 'Фильтры, тема и язык' },
    body: {
      he: 'סינון מתקדם לפי תקופה/אזור/תחום, מעבר בין מצב כהה לבהיר, והחלפת שפה עברית/אנגלית/רוסית.',
      en: 'Advanced filtering by era/region/field, dark-light theme toggle, and Hebrew/English/Russian switching.',
      ru: 'Расширенная фильтрация по эпохе/региону/области, переключение тёмной и светлой темы, выбор языка — иврит/английский/русский.',
    },
  },
]

interface Rect { top: number; left: number; width: number; height: number }

export function OnboardingTour({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(false)
  const [step, setStep]     = useState(0)
  const [rect, setRect]     = useState<Rect | null>(null)
  const isLoaded = useAppStore(s => s.isLoaded)
  const isHe = locale === 'he'

  // Launch on first visit (after data settles) or via the header help button
  useEffect(() => {
    let seen = true
    try { seen = localStorage.getItem(STORAGE_KEY) === '1' } catch { /* noop */ }
    if (!seen && isLoaded) {
      const t = setTimeout(() => { setStep(0); setActive(true) }, 900)
      return () => clearTimeout(t)
    }
  }, [isLoaded])

  useEffect(() => {
    const start = () => { setStep(0); setActive(true) }
    window.addEventListener('ozar-start-tour', start)
    return () => window.removeEventListener('ozar-start-tour', start)
  }, [])

  // Measure spotlight target
  const measure = useCallback(() => {
    const sel = STEPS[step]?.target
    if (!sel) { setRect(null); return }
    const el = document.querySelector(sel)
    if (!el) { setRect(null); return }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 })
  }, [step])

  useEffect(() => {
    if (!active) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  const finish = useCallback(() => {
    setActive(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* noop */ }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const fwd = isHe ? e.key === 'ArrowLeft' : e.key === 'ArrowRight'
        setStep(s => Math.max(0, Math.min(STEPS.length - 1, s + (fwd ? 1 : -1))))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish, isHe])

  if (!active) return null

  const s      = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Card position: below the spotlight when anchored, centered otherwise
  const cardStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: Math.min(rect.top + rect.height + 14, window.innerHeight - 240),
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 356)),
      }
    : {
        position: 'fixed',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true"
      aria-label={isHe ? 'סיור מודרך' : 'Guided tour'}>
      {/* Backdrop with spotlight hole */}
      {rect ? (
        <div
          className="fixed rounded-2xl transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top, left: rect.left, width: rect.width, height: rect.height,
            boxShadow: '0 0 0 9999px rgba(5,4,2,0.72)',
            border: '1.5px solid rgba(201,151,58,0.6)',
          }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: 'rgba(5,4,2,0.72)' }} onClick={finish} />
      )}

      {/* Step card */}
      <div
        className="glass rounded-2xl border border-gold-500/30 shadow-glass-lg p-5 w-[340px] max-w-[calc(100vw-32px)] animate-fade-in"
        style={cardStyle}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-gold-400 mb-1.5">
          {step + 1} / {STEPS.length}
        </p>
        <h2 className="font-serif text-lg font-bold text-ink-50 mb-2">{s.title[locale]}</h2>
        <p className="text-sm font-sans text-ink-300 leading-relaxed mb-4">{s.body[locale]}</p>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 mb-4" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={cn(
              'h-1.5 rounded-full transition-all',
              i === step ? 'w-5 bg-gold-400' : 'w-1.5 bg-ink-600',
            )} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => isLast ? finish() : setStep(x => x + 1)}
            className="flex-1 py-2 rounded-xl text-sm font-sans font-medium bg-gold-500/20 border border-gold-500/40 text-gold-300 hover:bg-gold-500/30 transition-all"
          >
            {isLast ? (isHe ? 'סיימנו — קדימה!' : 'Done — let’s go!') : (isHe ? 'הבא' : 'Next')}
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep(x => Math.max(0, x - 1))}
              className="px-4 py-2 rounded-xl text-sm font-sans border border-ink-600/40 text-ink-300 hover:text-ink-100 transition-all"
            >
              {isHe ? 'הקודם' : 'Back'}
            </button>
          )}
          {!isLast && (
            <button
              onClick={finish}
              className="px-3 py-2 text-xs font-sans text-ink-500 hover:text-ink-300 transition-colors"
            >
              {isHe ? 'דלג' : 'Skip'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

## FILE: components/ui/ReadingControls.tsx

_(85 lines)_

```tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'

const KEY = 'ozar-reading-prefs'

export interface ReadingPrefs {
  /** rem multiplier: 0.875 | 1 | 1.125 | 1.25 */
  scale: number
  /** true = serif (academic), false = sans (UI) */
  serif: boolean
}

const DEFAULT: ReadingPrefs = { scale: 1, serif: false }
const SCALES = [0.875, 1, 1.125, 1.25]

export function useReadingPrefs(): [ReadingPrefs, (p: ReadingPrefs) => void] {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setPrefs({ ...DEFAULT, ...JSON.parse(raw) })
    } catch { /* noop */ }
  }, [])

  const update = (p: ReadingPrefs) => {
    setPrefs(p)
    try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* noop */ }
  }
  return [prefs, update]
}

export function readingStyle(prefs: ReadingPrefs): React.CSSProperties {
  return {
    fontSize:   `${prefs.scale}em`,
    fontFamily: prefs.serif ? "'Frank Ruhl Libre', 'David Libre', serif" : undefined,
    lineHeight: 1.75,
  }
}

/** Compact A− / A+ / serif-toggle control row for reading views. */
export function ReadingControls({
  prefs, onChange, locale, className,
}: {
  prefs: ReadingPrefs
  onChange: (p: ReadingPrefs) => void
  locale: Locale
  className?: string
}) {
  const isHe = locale === 'he'
  const idx = SCALES.indexOf(prefs.scale)

  const bump = (dir: 1 | -1) => {
    const next = SCALES[Math.max(0, Math.min(SCALES.length - 1, (idx === -1 ? 1 : idx) + dir))]
    onChange({ ...prefs, scale: next })
  }

  const btn = 'px-2 py-1 rounded-md text-xs font-sans border border-ink-600/40 text-ink-300 hover:text-gold-300 hover:border-gold-500/30 transition-all disabled:opacity-30 disabled:pointer-events-none'

  return (
    <div className={cn('flex items-center gap-1.5', className)} role="group"
      aria-label={isHe ? 'הגדרות קריאה' : 'Reading settings'}>
      <button onClick={() => bump(-1)} disabled={idx <= 0} className={btn}
        aria-label={isHe ? 'הקטן גופן' : 'Smaller font'} title={isHe ? 'הקטן גופן' : 'Smaller font'}>
        A−
      </button>
      <button onClick={() => bump(1)} disabled={idx >= SCALES.length - 1} className={btn}
        aria-label={isHe ? 'הגדל גופן' : 'Larger font'} title={isHe ? 'הגדל גופן' : 'Larger font'}>
        A+
      </button>
      <button
        onClick={() => onChange({ ...prefs, serif: !prefs.serif })}
        className={cn(btn, prefs.serif && 'bg-gold-500/15 text-gold-300 border-gold-500/40')}
        aria-pressed={prefs.serif}
        title={isHe ? 'גופן ספרותי (סריף)' : 'Serif (academic) font'}
      >
        <span style={{ fontFamily: "'Frank Ruhl Libre', serif" }}>א</span>
      </button>
    </div>
  )
}
```

## FILE: components/ui/SearchBar.tsx

_(213 lines)_

```tsx
'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { searchSages } from '@/lib/supabase'
import { searchSagesLocal } from '@/lib/search'
import { useAppStore } from '@/store/useAppStore'
import { EraChip } from './EraChip'
import type { Sage, Locale } from '@/lib/types'
import { UI, tr } from '@/lib/i18n'

interface SearchBarProps {
  locale: Locale
  className?: string
}

export function SearchBar({ locale, className }: SearchBarProps) {
  const t = UI[locale]
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Sage[]>([])
  const [loading, setLoading]     = useState(false)
  const [focused, setFocused]     = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { selectSage, setSearchQuery, sages, connections } = useAppStore()

  // Popular sages (highest connection degree) — suggested on empty focus
  const popular = useMemo(() => {
    if (!sages.length) return []
    const deg = new Map<string, number>()
    connections.forEach(c => {
      deg.set(c.source, (deg.get(c.source) ?? 0) + 1)
      deg.set(c.target, (deg.get(c.target) ?? 0) + 1)
    })
    return [...sages]
      .sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0))
      .slice(0, 6)
  }, [sages, connections])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    // Instant fuzzy client-side search once the dataset is loaded
    // (handles "רמבם" → "רמב״ם" and similar spelling variations)
    if (sages.length > 0) {
      setResults(searchSagesLocal(sages, q, 8))
      return
    }
    // Fallback: Supabase ilike while data is still loading
    setLoading(true)
    const found = await searchSages(q, 8)
    setResults(found)
    setLoading(false)
  }, [sages])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      runSearch(query)
      setSearchQuery(query)
    }, 220)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, runSearch, setSearchQuery])

  const handleSelect = (sage: Sage) => {
    selectSage(sage)
    setQuery('')
    setResults([])
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const list = query.trim() ? results : popular
    if (!list.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, list.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(list[activeIdx])
    } else if (e.key === 'Escape') {
      setQuery('')
      setResults([])
      inputRef.current?.blur()
    }
  }

  // Suggestions shown: search results while typing, popular sages on empty focus
  const shown = query.trim() ? results : popular
  const showDropdown = focused && (shown.length > 0 || (loading && query.length > 0))

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl glass',
          'transition-all duration-200',
          focused && 'border-gold-500/40 shadow-gold-glow',
        )}
      >
        {/* Search icon */}
        <svg
          className="w-4 h-4 text-ink-400 flex-shrink-0"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={t.searchPlaceholder}
          className={cn(
            'flex-1 bg-transparent text-ink-100 placeholder-ink-400',
            'text-sm font-sans outline-none border-none',
            'min-w-0',
          )}
          aria-label={t.searchLabel}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
          autoComplete="off"
          data-search-input
        />

        {/* Loading spinner */}
        {loading && (
          <svg className="w-4 h-4 text-gold-400 animate-spin flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}

        {/* Clear */}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearchQuery('') }}
            className="text-ink-500 hover:text-ink-200 transition-colors flex-shrink-0"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className={cn(
            'absolute top-full mt-2 w-full z-50',
            'glass rounded-xl overflow-hidden shadow-glass-lg',
            'animate-fade-in',
          )}
        >
          {!query.trim() && shown.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-500">
              {tr(locale, 'חכמים מובילים', 'Popular sages', 'Известные мудрецы')}
            </p>
          )}
          <ul role="listbox" aria-label={t.searchLabel}>
            {shown.map((sage, idx) => (
              <li key={sage.id} role="option" aria-selected={idx === activeIdx}>
                <button
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-start',
                    'hover:bg-ink-700/50 transition-colors',
                    idx === activeIdx && 'bg-ink-700/50',
                    idx > 0 && 'border-t border-ink-700/40',
                  )}
                  onMouseDown={() => handleSelect(sage)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-serif font-medium text-ink-100 truncate">
                      {sage.label}
                    </p>
                    {sage.name_en && (
                      <p className="text-xs text-ink-400 font-sans truncate mt-0.5">
                        {sage.name_en}
                      </p>
                    )}
                  </div>
                  {sage.period && (
                    <EraChip period={sage.period} locale={locale} size="sm" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {results.length === 0 && !loading && query.length > 1 && (
            <p className="px-4 py-3 text-sm text-ink-400 font-sans text-center">
              {t.noResults}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

## FILE: components/ui/VizSkeleton.tsx

_(48 lines)_

```tsx
'use client'

/**
 * Skeleton screen shown while a visualization chunk loads
 * (tab transitions / dynamic imports). Pure CSS shimmer — no deps.
 */
type VizSkeletonVariant = 'canvas' | 'graph' | 'map' | 'timeline' | 'table' | 'list'

export function VizSkeleton({ variant = 'canvas' }: { variant?: VizSkeletonVariant }) {
  if (variant === 'list') {
    return (
      <div className="absolute inset-0 overflow-hidden px-6 py-6 space-y-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-ink-800/60 animate-pulse"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-busy="true" aria-live="polite">
      {/* Faux graph: pulsing dots + connecting lines */}
      <svg width="260" height="180" viewBox="0 0 260 180" className="opacity-60" aria-hidden>
        <g stroke="var(--ink-600)" strokeWidth="1" opacity="0.5">
          <line x1="60" y1="60" x2="130" y2="100" />
          <line x1="130" y1="100" x2="200" y2="50" />
          <line x1="130" y1="100" x2="110" y2="150" />
          <line x1="200" y1="50" x2="220" y2="120" />
        </g>
        {[
          [60, 60, 14], [130, 100, 18], [200, 50, 12], [110, 150, 10], [220, 120, 11],
        ].map(([cx, cy, r], i) => (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="var(--ink-700)"
            className="animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </svg>
    </div>
  )
}
```

## FILE: components/viz/Comparator.tsx

_(316 lines)_

```tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS, REGION_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import type { Locale, Sage } from '@/lib/types'
import { tr } from '@/lib/i18n'

// ── Minimal BFS to find path between two sages ──────────────────────────────
function findPath(aId: string, bId: string, connections: { source: string; target: string; type: string }[]): { sage: Sage; connType?: string }[] | null {
  // This is kept minimal — PathFinder handles the full UI; here we just need the result
  const adj = new Map<string, Array<{ id: string; type: string }>>()
  connections.forEach(c => {
    if (!adj.has(c.source)) adj.set(c.source, [])
    if (!adj.has(c.target)) adj.set(c.target, [])
    adj.get(c.source)!.push({ id: c.target, type: c.type })
    adj.get(c.target)!.push({ id: c.source, type: c.type })
  })
  if (aId === bId) return []
  const visited = new Set([aId])
  const queue: Array<{ id: string; path: Array<{ id: string; connType?: string }> }> = [
    { id: aId, path: [{ id: aId }] },
  ]
  while (queue.length) {
    const { id, path } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (visited.has(nb.id)) continue
      visited.add(nb.id)
      const newPath = [...path, { id: nb.id, connType: nb.type }]
      if (nb.id === bId) return newPath as any
      queue.push({ id: nb.id, path: newPath })
    }
  }
  return null
}

// ── Sage picker sub-component ────────────────────────────────────────────────
function SagePicker({ label, value, onChange, locale, exclude }: {
  label: string; value: Sage | null; onChange: (s: Sage | null) => void
  locale: Locale; exclude?: string
}) {
  const { sages } = useAppStore()
  const [query, setQuery] = useState(value?.label ?? '')
  const [open, setOpen] = useState(false)

  const results = query.length >= 1
    ? sages
        .filter(s => s.id !== exclude)
        .filter(s => s.label.includes(query) || s.name_en?.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6)
    : []

  function pick(s: Sage) {
    onChange(s)
    setQuery(s.label)
    setOpen(false)
  }

  return (
    <div className="relative">
      <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-1">{label}</p>
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tr(locale, 'חפש חכם…', 'Search sage…', 'Поиск мудреца…')}
          className={cn(
            'w-full text-sm font-sans px-3 py-2 rounded-lg',
            'bg-ink-800/70 border text-ink-100 placeholder-ink-600',
            'focus:outline-none focus:border-gold-500/50',
            value ? 'border-gold-500/40' : 'border-ink-700/50',
          )}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        />
        {value && (
          <button onClick={() => { onChange(null); setQuery('') }}
            className="absolute top-1/2 -translate-y-1/2 end-2 text-ink-600 hover:text-ink-300 text-xs">✕</button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden bg-ink-800 border border-ink-700/60 shadow-glass-lg max-h-48 overflow-y-auto">
          {results.map(s => (
            <li key={s.id} onMouseDown={() => pick(s)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-ink-700/60 cursor-pointer">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[s.period] ?? '#7a6550' }} />
              <span className="text-sm font-serif text-ink-100 flex-1 truncate">{s.label}</span>
              <span className="text-[10px] text-ink-500">{ERA_LABELS[s.period]?.[locale]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Sage column ──────────────────────────────────────────────────────────────
function SageColumn({ sage, locale, onSelect }: { sage: Sage; locale: Locale; onSelect: () => void }) {
  const color = ERA_COLORS[sage.period] ?? '#c9973a'
  const years = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 p-4 rounded-xl bg-ink-800/40 border border-ink-700/40">
      {/* Era chip + name */}
      <div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {ERA_LABELS[sage.period]?.[locale]}
        </span>
        <h3 className="font-serif text-base font-bold text-ink-50 leading-tight">{sage.label}</h3>
        {sage.name_en && <p className="text-xs text-ink-400 mt-0.5">{sage.name_en}</p>}
      </div>

      {/* Meta */}
      <dl className="text-xs font-sans space-y-1.5">
        {years && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-600">{tr(locale, 'שנים', 'Years', 'Годы')}</dt>
            <dd className="text-ink-300 tabular-nums">{years}</dd>
          </div>
        )}
        {sage.location && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-600">{tr(locale, 'מקום', 'Location', 'Место')}</dt>
            <dd className="text-ink-300 truncate max-w-[120px]">{sage.location}</dd>
          </div>
        )}
        {sage.field && (
          <div className="flex justify-between gap-2">
            <dt className="text-ink-600">{tr(locale, 'תחום', 'Field', 'Область')}</dt>
            <dd className="text-ink-300 truncate max-w-[120px]">{sage.field}</dd>
          </div>
        )}
      </dl>

      {/* Bio excerpt */}
      {sage.bio && (
        <p className="text-xs font-sans text-ink-400 leading-relaxed line-clamp-4">{sage.bio}</p>
      )}

      {/* Core concept */}
      {sage.core_concept && (
        <blockquote className="border-s-2 ps-3 italic text-xs text-ink-300 font-serif leading-relaxed"
          style={{ borderColor: color }}>
          {sage.core_concept.slice(0, 180)}{sage.core_concept.length > 180 ? '…' : ''}
        </blockquote>
      )}

      <button
        onClick={onSelect}
        className="mt-auto text-xs font-sans px-3 py-1.5 rounded-lg border transition-all text-center"
        style={{ borderColor: `${color}44`, color, background: `${color}10` }}
      >
        {tr(locale, 'פתח פרופיל', 'Open Profile', 'Открыть профиль')}
      </button>
    </div>
  )
}

// ── Main Comparator ──────────────────────────────────────────────────────────
interface ComparatorProps {
  locale: Locale
  onClose: () => void
}

export function Comparator({ locale, onClose }: ComparatorProps) {
  const { comparatorSages, setComparatorSage, connections, sageMap, selectSage } = useAppStore()
  const [sageA, sageB] = comparatorSages
  const isHe = locale === 'he'

  // Shared connections (sages both A and B are connected to)
  const neighborsA = new Set(
    connections
      .filter(c => sageA && (c.source === sageA.id || c.target === sageA.id))
      .map(c => sageA && c.source === sageA.id ? c.target : c.source)
  )
  const sharedConnections = sageB
    ? connections.filter(c =>
        (c.source === sageB.id || c.target === sageB.id) &&
        (neighborsA.has(c.source) || neighborsA.has(c.target))
      ).map(c => {
        const otherId = (c.source === sageB.id ? c.target : c.source)
        return { sage: sageMap.get(otherId), type: c.type }
      }).filter(x => x.sage && x.sage.id !== sageA?.id && x.sage.id !== sageB?.id)
      .slice(0, 6)
    : []

  // Direct path
  const rawPath = (sageA && sageB) ? findPath(sageA.id, sageB.id, connections) : null
  const directConn = sageA && sageB
    ? connections.find(c =>
        (c.source === sageA.id && c.target === sageB.id) ||
        (c.source === sageB.id && c.target === sageA.id)
      )
    : null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(10,8,6,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className={cn(
        'glass rounded-2xl border border-ink-700/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto',
        'flex flex-col gap-0',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/40">
          <div>
            <h2 className="font-serif text-base font-bold text-ink-100">
              {isHe ? 'השוואת חכמים' : 'Sage Comparator'}
            </h2>
            <p className="text-[10px] font-sans text-ink-500 mt-0.5">
              {isHe ? 'השווה בין שני חכמים — ביוגרפיה, קשרים וחיתוך' : 'Compare two sages — biography, connections, overlap'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-ink-700/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pickers */}
        <div className="grid grid-cols-2 gap-4 px-5 py-4 border-b border-ink-700/40">
          <SagePicker
            label={isHe ? 'חכם א׳' : 'Sage A'}
            value={sageA}
            onChange={s => setComparatorSage(0, s)}
            locale={locale}
            exclude={sageB?.id}
          />
          <SagePicker
            label={isHe ? 'חכם ב׳' : 'Sage B'}
            value={sageB}
            onChange={s => setComparatorSage(1, s)}
            locale={locale}
            exclude={sageA?.id}
          />
        </div>

        {/* Columns */}
        {(sageA || sageB) && (
          <div className="flex gap-3 px-5 py-4">
            {sageA && <SageColumn sage={sageA} locale={locale} onSelect={() => { selectSage(sageA); onClose() }} />}

            {/* Middle divider with relationship info */}
            <div className="flex flex-col items-center justify-start gap-2 pt-4 flex-shrink-0 w-10">
              <div className="w-px flex-1 bg-ink-700/40" />
              {directConn && (
                <div className="px-1 py-3 rounded-lg bg-gold-500/10 border border-gold-500/25 text-center">
                  <span className="text-[8px] font-sans text-gold-400 writing-mode-vertical">
                    {CONNECTION_LABELS[directConn.type]?.[locale] ?? directConn.type}
                  </span>
                </div>
              )}
              {rawPath && !directConn && rawPath.length > 0 && (
                <div className="px-1 py-2 rounded bg-ink-700/50 text-center">
                  <span className="text-[9px] font-mono text-ink-400">{rawPath.length - 1}°</span>
                </div>
              )}
              <div className="w-px flex-1 bg-ink-700/40" />
            </div>

            {sageB && <SageColumn sage={sageB} locale={locale} onSelect={() => { selectSage(sageB); onClose() }} />}
          </div>
        )}

        {/* Shared connections */}
        {sharedConnections.length > 0 && (
          <div className="px-5 py-4 border-t border-ink-700/40">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-3">
              {isHe ? `קשרים משותפים (${sharedConnections.length})` : `Shared connections (${sharedConnections.length})`}
            </p>
            <div className="flex flex-wrap gap-2">
              {sharedConnections.map(({ sage, type }, i) => {
                if (!sage) return null
                const color = ERA_COLORS[sage.period] ?? '#7a6550'
                return (
                  <button
                    key={i}
                    onClick={() => { selectSage(sage); onClose() }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans border transition-all hover:border-ink-500/60"
                    style={{ background: `${color}10`, borderColor: `${color}30`, color: 'var(--ink-300)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    {sage.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Degrees of separation */}
        {rawPath !== null && sageA && sageB && (
          <div className="px-5 py-3 border-t border-ink-700/40 flex items-center gap-3">
            <span className="text-xl font-mono font-bold"
              style={{ color: rawPath.length === 2 ? '#27ae60' : rawPath.length <= 4 ? '#f1c40f' : '#e67e22' }}>
              {rawPath.length - 1}
            </span>
            <span className="text-xs font-sans text-ink-400">
              {isHe ? 'מעלות הפרדה' : 'degrees of separation'}
            </span>
          </div>
        )}
        {rawPath === null && sageA && sageB && (
          <div className="px-5 py-3 border-t border-ink-700/40 text-xs font-sans text-ink-500">
            {isHe ? 'לא נמצא מסלול בין שני חכמים אלה' : 'No path found between these sages'}
          </div>
        )}
      </div>
    </div>
  )
}
```

## FILE: components/viz/FilterChips.tsx

_(110 lines)_

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { cn } from '@/lib/utils'

const ERAS: Period[] = ALL_PERIODS
const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach',
]

/**
 * פס סינון מהיר מעל רשת הקשרים — לחיצה אחת על תקופה / אזור / תחום מסננת מיד
 * (כמו באתר הקלאסי). ריבוי בחירות נתמך; "נקה" מאפס הכל.
 */
export function FilterChips({ locale }: { locale: Locale }) {
  const {
    sages, filteredSages, filters, availableFields,
    togglePeriodFilter, toggleRegionFilter, toggleFieldFilter, clearFilters,
  } = useAppStore()
  const [showFields, setShowFields] = useState(false)
  const isHe = locale === 'he'

  const activeCount = filters.period.length + filters.region.length + filters.field.length
  const topFields = useMemo(() => {
    const counts = new Map<string, number>()
    sages.forEach(s => {
      (s.field || '').split(',').map(f => f.trim()).filter(Boolean)
        .forEach(f => counts.set(f, (counts.get(f) || 0) + 1))
    })
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([f]) => f)
  }, [sages])

  const chip = 'px-2.5 py-1 rounded-full text-[10.5px] font-sans font-semibold border cursor-pointer whitespace-nowrap transition-all select-none'

  if (!sages.length) return null

  return (
    <div className="absolute top-2 inset-x-2 z-10 flex flex-col items-center gap-1 pointer-events-none">
      {/* Row 1: eras + regions */}
      <div className="pointer-events-auto glass rounded-xl px-2 py-1.5 flex gap-1 items-center max-w-full overflow-x-auto no-scrollbar">
        {ERAS.map(era => {
          const on = filters.period.includes(era)
          const c = ERA_COLORS[era]
          return (
            <button key={era} onClick={() => togglePeriodFilter(era)}
              className={chip}
              style={on
                ? { background: c, borderColor: c, color: '#0a0806' }
                : { background: 'transparent', borderColor: c + '66', color: c }}>
              {ERA_LABELS[era]?.[locale] ?? era}
            </button>
          )
        })}
        <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
        {REGIONS.map(region => {
          const on = filters.region.includes(region)
          const c = REGION_COLORS[region]
          return (
            <button key={region} onClick={() => toggleRegionFilter(region)}
              className={chip}
              style={on
                ? { background: c, borderColor: c, color: '#0a0806' }
                : { background: 'transparent', borderColor: c + '66', color: c }}>
              {REGION_LABELS[region]?.[locale] ?? region}
            </button>
          )
        })}
        <span className="w-px h-4 bg-ink-600/50 mx-0.5 flex-shrink-0" />
        <button onClick={() => setShowFields(v => !v)}
          className={cn(chip, 'border-ink-500/60 text-ink-300', showFields && 'bg-ink-700/60')}>
          {isHe ? 'תחומים' : 'Fields'} {showFields ? '▴' : '▾'}
        </button>
        {activeCount > 0 && (
          <>
            <button onClick={() => { clearFilters(); setShowFields(false) }}
              className={cn(chip, 'border-red-400/60 text-red-300 hover:bg-red-500/15')}>
              ✕ {isHe ? 'נקה' : 'Clear'}
            </button>
            <span className="text-[10px] font-sans text-gold-300 whitespace-nowrap px-1">
              {filteredSages.length}/{sages.length}
            </span>
          </>
        )}
      </div>

      {/* Row 2: fields (on demand) */}
      {showFields && (
        <div className="pointer-events-auto glass rounded-xl px-2 py-1.5 flex gap-1 items-center max-w-full overflow-x-auto no-scrollbar animate-fade-in">
          {topFields.map(field => {
            const on = filters.field.includes(field)
            return (
              <button key={field} onClick={() => toggleFieldFilter(field)}
                className={chip}
                style={on
                  ? { background: '#c9973a', borderColor: '#c9973a', color: '#0a0806' }
                  : { background: 'transparent', borderColor: '#c9973a66', color: '#c9973a' }}>
                {field}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

## FILE: components/viz/GenealogyTree.tsx

_(302 lines)_

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Period } from '@/lib/types'
import { tr } from '@/lib/i18n'

const ERA_ORDER: Period[] = ALL_PERIODS

const BAND_H   = 150   // px per era band
const LABEL_W  = 90    // left margin for era labels
const PAD_TOP  = 48    // top padding (for era label row)
const TOTAL_H  = PAD_TOP + BAND_H * ERA_ORDER.length + 32

interface GenealogyTreeProps { locale: Locale }

export function GenealogyTree({ locale }: GenealogyTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { sages, connections, selectSage, selectedSageId } = useAppStore()

  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true

    async function build() {
      const d3 = await import('d3')
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      const W = Math.max(container.clientWidth || 900, 1000)

      d3.select(container).selectAll('svg').remove()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', W)
        .attr('height', TOTAL_H)
        .style('background', 'transparent')

      // ── SVG defs ─────────────────────────────────────────────────────
      const defs = svg.append('defs')

      // Arrowhead for teacher→student direction
      defs.append('marker')
        .attr('id', 'gt-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 12).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#3b82f6').attr('opacity', 0.75)

      // Glow filter for selected node
      const glow = defs.append('filter').attr('id', 'gt-glow')
      glow.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', 4).attr('result', 'blur')
      const feMerge = glow.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'blur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

      // ── Era bands ─────────────────────────────────────────────────────
      const bandsG = svg.append('g').attr('pointer-events', 'none')
      ERA_ORDER.forEach((era, i) => {
        const color = ERA_COLORS[era]
        const y = PAD_TOP + i * BAND_H
        // Band fill
        bandsG.append('rect')
          .attr('x', 0).attr('y', y)
          .attr('width', W).attr('height', BAND_H)
          .attr('fill', color).attr('opacity', i % 2 === 0 ? 0.04 : 0.07)
        // Separator line
        bandsG.append('line')
          .attr('x1', 0).attr('y1', y).attr('x2', W).attr('y2', y)
          .attr('stroke', color).attr('stroke-width', 0.5).attr('opacity', 0.25)
        // Era label on the left
        bandsG.append('text')
          .attr('x', 8).attr('y', y + 18)
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', '10px').attr('font-weight', '700')
          .attr('fill', color).attr('opacity', 0.7)
          .text(ERA_LABELS[era]?.[locale] ?? era)
      })

      // ── Data prep ─────────────────────────────────────────────────────
      const nodeData = sages.map(s => ({
        ...s,
        degree: 0,
        x: LABEL_W + Math.random() * (W - LABEL_W * 2),
        y: PAD_TOP + (ERA_ORDER.indexOf(s.period) >= 0 ? ERA_ORDER.indexOf(s.period) : 3) * BAND_H + BAND_H / 2,
        vx: 0, vy: 0,
        fx: null as number | null,
        fy: null as number | null,
      }))
      const nodeById = new Map(nodeData.map(n => [n.id, n]))

      // Teacher→student edges only; normalise direction: source=teacher, target=student
      const linkData = connections
        .filter(c => c.type === 'teacher' || c.type === 'student')
        .map(c => c.type === 'student'
          ? { source: c.target, target: c.source }
          : { source: c.source, target: c.target }
        )
        .filter(c => nodeById.has(c.source) && nodeById.has(c.target))

      linkData.forEach(l => {
        const s = nodeById.get(l.source); if (s) s.degree++
        const t = nodeById.get(l.target); if (t) t.degree++
      })

      const r = (d: any) => Math.min(20, 4 + Math.sqrt(d.degree || 0) * 2.2)

      // Adjacency for hover highlight (bidirectional for display)
      const adj = new Map<string, Set<string>>()
      linkData.forEach(l => {
        if (!adj.has(l.source)) adj.set(l.source, new Set())
        if (!adj.has(l.target)) adj.set(l.target, new Set())
        adj.get(l.source)!.add(l.target)
        adj.get(l.target)!.add(l.source)
      })

      // ── Force simulation ──────────────────────────────────────────────
      const eraYOf = (d: any) => {
        const i = ERA_ORDER.indexOf(d.period as Period)
        return PAD_TOP + (i >= 0 ? i : 3) * BAND_H + BAND_H / 2
      }

      const sim = d3.forceSimulation(nodeData as any)
        .force('link', d3.forceLink(linkData as any).id((d: any) => d.id).distance(55).strength(0.25))
        .force('charge', d3.forceManyBody().strength(-70))
        .force('x', d3.forceX((d: any) => {
          // Hub nodes gravitate toward center, sparse ones spread out
          const deg = (d as any).degree || 0
          return LABEL_W + (W - LABEL_W * 2) * (0.1 + 0.8 * (deg > 5 ? 0.5 : Math.random()))
        }).strength(0.04))
        .force('y', d3.forceY(eraYOf).strength(0.9))   // strong: keeps nodes in their band
        .force('collide', d3.forceCollide((d: any) => r(d) + 5).strength(0.85))
        .alphaDecay(0.025)

      // ── Pan/zoom ──────────────────────────────────────────────────────
      const g = svg.append('g')
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.15, 4])
        .on('zoom', ev => g.attr('transform', ev.transform))
      svg.call(zoom)

      // ── Links ─────────────────────────────────────────────────────────
      const linkG = g.append('g')
      const link = linkG.selectAll('path')
        .data(linkData).join('path')
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.1)
        .attr('stroke-opacity', 0.18)
        .attr('marker-end', 'url(#gt-arrow)')

      // ── Nodes ─────────────────────────────────────────────────────────
      const nodeG = g.append('g')
      const node = nodeG.selectAll('circle')
        .data(nodeData).join('circle')
        .attr('r', r)
        .attr('fill', (d: any) => ERA_COLORS[d.period as Period] ?? '#7a6550')
        .attr('stroke', '#0a0806')
        .attr('stroke-width', 1.5)
        .attr('fill-opacity', 0.88)
        .style('cursor', 'pointer')

      // ── Labels ────────────────────────────────────────────────────────
      const labelG = g.append('g')
      const label = labelG.selectAll('text')
        .data(nodeData).join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => `-${r(d) + 4}px`)
        .attr('font-family', 'Heebo, sans-serif')
        .attr('font-size', '9px').attr('font-weight', '500')
        .attr('fill', '#e8d5b0')
        .attr('stroke', '#0a0806').attr('stroke-width', 2).attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .attr('opacity', 0)
        .text((d: any) => d.label || '')

      // ── Drag ──────────────────────────────────────────────────────────
      const drag = d3.drag<SVGCircleElement, any>()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      node.call(drag as any)

      // ── Interactions ──────────────────────────────────────────────────
      node
        .on('mouseover', (_ev: MouseEvent, d: any) => {
          const nb = adj.get(d.id) || new Set()
          node.transition().duration(150)
            .attr('fill-opacity', (n: any) => n.id === d.id || nb.has(n.id) ? 1 : 0.07)
            .attr('r', (n: any) => n.id === d.id ? r(n) + 3 : r(n))
          link.transition().duration(150)
            .attr('stroke-opacity', (l: any) => {
              const sId = typeof l.source === 'string' ? l.source : l.source.id
              const tId = typeof l.target === 'string' ? l.target : l.target.id
              return sId === d.id || tId === d.id ? 0.85 : 0.02
            })
          label.transition().duration(150)
            .attr('opacity', (n: any) => n.id === d.id || nb.has(n.id) ? 1 : 0)
        })
        .on('mouseout', () => {
          node.transition().duration(300).attr('fill-opacity', 0.88).attr('r', r)
          link.transition().duration(300).attr('stroke-opacity', 0.18)
          label.transition().duration(300).attr('opacity', 0)
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          const sage = sages.find(s => s.id === d.id)
          if (sage) selectSage(sage)
        })

      // ── Tick ──────────────────────────────────────────────────────────
      sim.on('tick', () => {
        // Clamp to era band (hard constraint)
        nodeData.forEach((d: any) => {
          const i = ERA_ORDER.indexOf(d.period as Period)
          if (i < 0) return
          const yMin = PAD_TOP + i * BAND_H + 14
          const yMax = PAD_TOP + (i + 1) * BAND_H - 14
          d.y = Math.max(yMin, Math.min(yMax, d.y))
          d.x = Math.max(LABEL_W + 10, Math.min(W - 10, d.x))
        })

        link.attr('d', (d: any) => {
          const sx = d.source.x, sy = d.source.y
          const tx = d.target.x, ty = d.target.y
          const mx = (sx + tx) / 2, my = (sy + ty) / 2
          const dx = tx - sx, dy = ty - sy
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const ox = -dy / dist * 14
          const oy =  dx / dist * 14
          return `M${sx},${sy} Q${mx + ox},${my + oy} ${tx},${ty}`
        })
        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
        label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
      })
    }

    build()
    return () => { mounted = false }
  }, [sages.length, connections.length, locale])

  // Selection ring: sync when selectedSageId changes (separate effect, no rebuild)
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const d3Sel = (window as any).__d3
    // Handled inside build() via store subscription — selectedSageId is read at click time
  }, [selectedSageId])

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Info bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-ink-700/40 bg-ink-900/60">
        <span className="text-xs font-sans text-ink-400">
          {locale === 'he'
            ? 'עץ שושלות — חיצים: כיוון רב → תלמיד'
            : 'Lineage Tree — arrows: teacher → student direction'}
        </span>
        <span className="text-[10px] font-sans text-ink-600">
          {tr(locale, 'גרור · זום · לחץ לפרופיל', 'Drag · Zoom · Click for profile', 'Перетаскивание · Зум · Клик — профиль')}
        </span>
      </div>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-auto" dir="ltr">
        <div
          ref={containerRef}
          className="min-h-full"
          style={{ minWidth: 1000, height: TOTAL_H }}
        />
      </div>

      {/* Era legend strip */}
      <div className="flex-shrink-0 flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-ink-700/40 bg-ink-900/60">
        {ERA_ORDER.map(era => (
          <div key={era} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: ERA_COLORS[era] }} />
            <span className="text-[10px] font-sans text-ink-400 whitespace-nowrap">
              {ERA_LABELS[era]?.[locale]}
            </span>
            <span className="text-ink-800 mx-1">·</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 flex-shrink-0 ms-2">
          <svg width="28" height="8">
            <line x1="2" y1="4" x2="22" y2="4" stroke="#3b82f6" strokeWidth="1.5" opacity="0.75" />
            <polygon points="22,1.5 27,4 22,6.5" fill="#3b82f6" opacity="0.75" />
          </svg>
          <span className="text-[10px] font-sans text-ink-500">
            {tr(locale, 'רב ← תלמיד', 'teacher → student', 'учитель → ученик')}
          </span>
        </div>
      </div>
    </div>
  )
}
```

## FILE: components/viz/GeoMap.tsx

_(478 lines)_

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { CONNECTION_TYPE_COLORS } from '@/lib/regions'
import { LOCATION_COORDS, resolveCoords } from '@/lib/locationCoords'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'

// Hebrew/English → {lat, lng} gazetteer + resolveCoords:
// moved verbatim to lib/locationCoords.ts (shared with the Sage Dossier
// mini-map) and imported above.

interface GeoMapProps {
  locale: Locale
}

export function GeoMap({ locale }: GeoMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObjRef  = useRef<import('leaflet').Map | null>(null)
  const [showLinks, setShowLinks] = useState(true)
  const [mapReady, setMapReady] = useState(false)

  const { sages, filteredSages, selectedSageId, selectSage, connections, activeTab, theme } = useAppStore()

  useEffect(() => {
    if (!mapRef.current || !sages.length) return
    // Rebuild when the dataset is replaced (data.json fallback swaps sage ids)
    if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; setMapReady(false) }

    let mounted = true

    import('leaflet').then(L => {
      if (!mounted || !mapRef.current || mapObjRef.current) return

      // Fix default icon path
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center:           [33, 30],
        zoom:             4,
        zoomControl:      false,
        attributionControl: true,
      })
      mapObjRef.current = map

      // CartoDB tiles — ללא תוויות לועזיות; שמות בעברית נוספים כשכבה משלנו.
      // הכתובת נבחרת לפי ערכת הנושא ומוחלפת חיה במעבר כהה/בהיר.
      const isLight = document.documentElement.dataset.theme === 'light'
      const tiles = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/${isLight ? 'light_nolabels' : 'dark_nolabels'}/{z}/{x}/{y}{r}.png`,
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 18,
        }
      ).addTo(map)
      ;(map as any)._tileLayer = tiles

      // ── שמות ארצות ואזורים — עברית/אנגלית לפי שפת הממשק ──────────
      const REGION_MAP_LABELS: Array<[string, string, number, number, number]> = [
        ['ארץ ישראל', 'Eretz Israel', 31.55, 34.95, 13], ['מצרים', 'Egypt', 28.6, 30.6, 12],
        ['בבל (עיראק)', 'Babylonia (Iraq)', 32.2, 43.7, 12],
        ['פרס', 'Persia', 32.4, 54.0, 12], ['תימן', 'Yemen', 15.6, 47.5, 11],
        ['טורקיה', 'Turkey', 39.2, 33.5, 12],
        ['יוון', 'Greece', 39.4, 22.3, 11], ['איטליה', 'Italy', 42.9, 12.4, 12],
        ['ספרד', 'Spain', 40.0, -3.9, 13],
        ['פורטוגל', 'Portugal', 39.6, -8.3, 11], ['צרפת', 'France', 47.2, 2.4, 12],
        ['פרובנס', 'Provence', 43.7, 5.6, 10],
        ['אשכנז (גרמניה)', 'Ashkenaz (Germany)', 50.8, 10.2, 12],
        ['אוסטריה', 'Austria', 47.4, 14.8, 10], ['בוהמיה', 'Bohemia', 49.8, 15.0, 10],
        ['פולין', 'Poland', 52.1, 19.4, 12], ['ליטא', 'Lithuania', 55.3, 24.0, 11],
        ['רוסיה', 'Russia', 56.5, 38.5, 12],
        ['אוקראינה', 'Ukraine', 48.8, 31.4, 11], ['מרוקו', 'Morocco', 31.6, -6.8, 11],
        ['אלג׳יריה', 'Algeria', 34.8, 2.8, 11],
        ['תוניסיה', 'Tunisia', 34.2, 9.4, 10], ['לוב', 'Libya', 29.8, 17.5, 10],
        ['ארה״ב', 'USA', 39.0, -98.0, 12],
      ]
      REGION_MAP_LABELS.forEach(([he, en, lat, lng, size]) => {
        const name = locale === 'he' ? he : en
        L.marker([lat as number, lng as number], {
          icon: L.divIcon({
            className: '',
            html: `<span style="font-family:'Frank Ruhl Libre',serif;font-size:${size}px;font-weight:700;color:var(--ink-200);opacity:0.9;text-shadow:0 0 4px var(--ink-900), 0 0 8px var(--ink-900);white-space:nowrap;">${name}</span>`,
            iconSize: [0, 0],
          }),
          interactive: false,
          keyboard: false,
        }).addTo(map)
      })

      // Custom zoom controls (top-end corner)
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Override Leaflet zoom button style with glass look via inline CSS
      const style = document.createElement('style')
      style.textContent = `
        .leaflet-control-zoom a {
          background: rgba(26,20,14,0.8) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(201,151,58,0.2) !important;
          color: #c4a87d !important;
        }
        .leaflet-control-zoom a:hover { color: #e8b84b !important; }
        .leaflet-control-attribution {
          background: rgba(10,8,6,0.7) !important;
          color: #5a4a38 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #7a6550 !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(26,20,14,0.95) !important;
          border: 1px solid rgba(201,151,58,0.2) !important;
          border-radius: 8px !important;
          color: #e8d5b0 !important;
        }
        .leaflet-popup-tip { background: rgba(26,20,14,0.95) !important; }
        [data-theme='light'] .leaflet-control-zoom a {
          background: rgba(255,252,244,0.92) !important;
          border: 1px solid rgba(138,106,30,0.35) !important;
          color: #6d4f12 !important;
        }
        [data-theme='light'] .leaflet-popup-content-wrapper {
          background: rgba(255,252,244,0.97) !important;
          border: 1px solid rgba(138,106,30,0.3) !important;
          color: #241b10 !important;
        }
        [data-theme='light'] .leaflet-popup-tip { background: rgba(255,252,244,0.97) !important; }
        .leaflet-tooltip {
          background: rgba(26,20,14,0.94) !important;
          border: 1px solid rgba(201,151,58,0.3) !important;
          border-radius: 8px !important;
          color: #e8d5b0 !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
          padding: 5px 9px !important;
        }
        .leaflet-tooltip-top:before { border-top-color: rgba(201,151,58,0.3) !important; }
        [data-theme='light'] .leaflet-tooltip {
          background: rgba(255,252,244,0.97) !important;
          border: 1px solid rgba(138,106,30,0.35) !important;
          color: #241b10 !important;
        }
        [data-theme='light'] .leaflet-tooltip-top:before { border-top-color: rgba(138,106,30,0.35) !important; }
      `
      document.head.appendChild(style)

      // ── Markers ──────────────────────────────────────────────
      const markerRefs = new Map<string, import('leaflet').CircleMarker>()
      const markersLayer = L.layerGroup().addTo(map)

      sages.forEach(sage => {
        const coords = resolveCoords(sage)
        if (!coords) return

        const color = ERA_COLORS[sage.period] ?? '#7a6550'

        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius:      7,
          fillColor:   color,
          color:       '#0a0806',
          weight:      1.5,
          opacity:     1,
          fillOpacity: 0.85,
        }).addTo(markersLayer)

        const eraLabel = ERA_LABELS[sage.period]?.[locale] ?? sage.period
        const years = [sage.birth_year, sage.death_year].filter(Boolean).join(' – ')

        const popupContent = `
          <div style="font-family:Heebo,sans-serif;min-width:160px;">
            <p style="font-family:'Frank Ruhl Libre',serif;font-size:15px;font-weight:700;
               color:#e8d5b0;margin:0 0 4px;">${sage.label}</p>
            ${sage.name_en ? `<p style="font-size:11px;color:#9a8570;margin:0 0 6px;">${sage.name_en}</p>` : ''}
            <p style="margin:0 0 6px;">
              <span style="font-size:10px;padding:1px 8px;border-radius:9999px;
                background:${color}22;color:${color};border:1px solid ${color}55;">${eraLabel}</span>
              ${years ? `<span style="font-size:10px;color:#9a8570;margin-inline-start:6px;">${years}</span>` : ''}
            </p>
            ${sage.location ? `<p style="font-size:11px;color:#7a6550;margin:0;">📍 ${sage.location}</p>` : ''}
            ${sage.spotify_url ? `<a href="${sage.spotify_url}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;padding:3px 10px;background:#1DB954;color:#fff;border-radius:12px;font-size:10px;font-weight:700;text-decoration:none;">🎵 ${tr(locale, 'האזן בספוטיפיי', 'Listen on Spotify', 'Слушать в Spotify')}</a>` : ''}
          </div>
        `
        marker.bindPopup(popupContent, { maxWidth: 220, className: '' })

        // Hover mini-card (masterplan §3: enhanced tooltips)
        marker.bindTooltip(
          `<div style="font-family:Heebo,sans-serif;text-align:${locale === 'he' ? 'right' : 'left'};" dir="${locale === 'he' ? 'rtl' : 'ltr'}">
            <span style="font-family:'Frank Ruhl Libre',serif;font-size:13px;font-weight:700;">${sage.label}</span>
            <span style="font-size:10px;color:${color};margin-inline-start:6px;">${eraLabel}</span>
            ${years ? `<div style="font-size:10px;opacity:0.7;">${years}</div>` : ''}
          </div>`,
          { direction: 'top', opacity: 0.95, offset: [0, -6], sticky: false },
        )

        marker.on('click', () => selectSage(sage))
        markerRefs.set(sage.id, marker)
      })

      // ── Marker clustering at low zoom (dense areas: Israel, Spain…) ──
      // Grid-based, dependency-free. Above CLUSTER_MAX_ZOOM the individual
      // markers return; a cluster bubble click zooms into that area.
      const CLUSTER_MAX_ZOOM = 5
      const clusterLayer = L.layerGroup().addTo(map)
      const sageById = new Map(sages.map(s => [s.id, s]))

      const renderClusters = () => {
        const z = map.getZoom()
        clusterLayer.clearLayers()
        if (z > CLUSTER_MAX_ZOOM) {
          if (!map.hasLayer(markersLayer)) map.addLayer(markersLayer)
          return
        }
        if (map.hasLayer(markersLayer)) map.removeLayer(markersLayer)

        const cell = 360 / Math.pow(2, z + 3)   // grid size in degrees, shrinks with zoom
        const buckets = new Map<string, { latSum: number; lngSum: number; ids: string[] }>()
        markerRefs.forEach((m, id) => {
          const ll = m.getLatLng()
          const key = `${Math.round(ll.lat / cell)}:${Math.round(ll.lng / cell)}`
          const b = buckets.get(key) ?? { latSum: 0, lngSum: 0, ids: [] }
          b.latSum += ll.lat; b.lngSum += ll.lng; b.ids.push(id)
          buckets.set(key, b)
        })

        buckets.forEach(b => {
          const lat = b.latSum / b.ids.length
          const lng = b.lngSum / b.ids.length

          if (b.ids.length === 1) {
            // Single sage — draw a regular dot
            const sage = sageById.get(b.ids[0])
            if (!sage) return
            const c = ERA_COLORS[sage.period] ?? '#7a6550'
            L.circleMarker([lat, lng], {
              radius: 7, fillColor: c, color: '#0a0806', weight: 1.5, fillOpacity: 0.85,
            })
              .on('click', () => selectSage(sage))
              .bindTooltip(sage.label, { direction: 'top', offset: [0, -6] })
              .addTo(clusterLayer)
            return
          }

          // Cluster bubble with count — click zooms in
          const size = Math.min(46, 26 + Math.sqrt(b.ids.length) * 3)
          L.marker([lat, lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;
                display:flex;align-items:center;justify-content:center;
                background:rgba(201,151,58,0.85);border:2px solid rgba(255,244,220,0.9);
                color:#1a140e;font-family:Heebo,sans-serif;font-weight:700;
                font-size:${b.ids.length > 99 ? 11 : 13}px;
                box-shadow:0 2px 10px rgba(0,0,0,0.45);cursor:pointer;">
                ${b.ids.length}</div>`,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            }),
          })
            .on('click', () => map.setView([lat, lng], Math.min(CLUSTER_MAX_ZOOM + 2, z + 3)))
            .addTo(clusterLayer)
        })
      }

      map.on('zoomend', renderClusters)
      renderClusters()

      // ── Migration paths ──────────────────────────────────────
      sages.forEach(sage => {
        if (!sage.migration_path) return
        const path = sage.migration_path
        const stops = [path.from, ...(path.intermediate ?? []), path.to]

        const coordStops = stops
          .map(name => LOCATION_COORDS[name] ?? null)
          .filter(Boolean) as Array<{ lat: number; lng: number }>

        if (coordStops.length < 2) return

        const color = ERA_COLORS[sage.period] ?? '#7a6550'

        L.polyline(
          coordStops.map(c => [c.lat, c.lng] as [number, number]),
          { color, weight: 2, opacity: 0.5, dashArray: '6,4' }
        ).addTo(map)

        // Directional arrowhead at each segment midpoint (origin → destination)
        coordStops.forEach((_, i) => {
          if (i === 0) return
          const prev = coordStops[i - 1]
          const curr = coordStops[i]
          const mid = { lat: (prev.lat + curr.lat) / 2, lng: (prev.lng + curr.lng) / 2 }
          const dx = (curr.lng - prev.lng) * Math.cos(((prev.lat + curr.lat) / 2) * Math.PI / 180)
          const dy = curr.lat - prev.lat
          const angle = Math.atan2(-dy, dx) * 180 / Math.PI
          L.marker([mid.lat, mid.lng], {
            icon: L.divIcon({
              className: '',
              html: `<span style="display:inline-block;transform:rotate(${angle}deg);color:${color};font-size:12px;opacity:0.9;text-shadow:0 0 3px var(--ink-900);">➤</span>`,
              iconSize: [0, 0],
            }),
            interactive: false,
          }).addTo(map)
        })
      })

      // ── Build coordsById for connection lines ────────────────
      const coordsById = new Map<string, { lat: number; lng: number }>()
      sages.forEach(sage => {
        const c = resolveCoords(sage)
        if (c) coordsById.set(sage.id, c)
      })

      // Store refs for later
      ;(map as any)._sageMarkers = markerRefs
      ;(map as any)._coordsById  = coordsById
      ;(map as any)._linkLayer   = null
      setMapReady(true)   // triggers the connection-lines layer
    })

    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

  // ── Connection lines layer toggle ───────────────────────────
  useEffect(() => {
    const map = mapObjRef.current as any
    if (!map) return

    // Remove existing link layer
    if (map._linkLayer) {
      map._linkLayer.remove()
      map._linkLayer = null
    }
    if (!showLinks || !map._coordsById) return

    import('leaflet').then(L => {
      const sageMap = new Map<string, Sage>(sages.map(s => [s.id, s]))
      const coordsById: Map<string, { lat: number; lng: number }> = map._coordsById
      const group = L.layerGroup().addTo(map)
      map._linkLayer = group

      const drawn = new Set<string>()
      connections.forEach(conn => {
        const key = [conn.source, conn.target].sort().join('|')
        if (drawn.has(key)) return
        const a = coordsById.get(conn.source)
        const b = coordsById.get(conn.target)
        if (!a || !b) return
        // same-city pairs draw nothing meaningful on the map
        if (Math.abs(a.lat - b.lat) < 0.02 && Math.abs(a.lng - b.lng) < 0.02) return
        drawn.add(key)
        const color = CONNECTION_TYPE_COLORS[conn.type] ?? '#c9973a'
        L.polyline(
          [[a.lat, a.lng], [b.lat, b.lng]],
          {
            color, weight: 1.3, opacity: 0.4,
            dashArray: conn.type === 'influence' ? '6,4'
              : (conn.type === 'colleague' || conn.type === 'contemporary') ? '2,4' : undefined,
          }
        ).addTo(group)
        // ראש חץ בכיוון הקשר (מקור ← יעד)
        const t = 0.58
        const pLat = a.lat + (b.lat - a.lat) * t
        const pLng = a.lng + (b.lng - a.lng) * t
        const dx = (b.lng - a.lng) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
        const dy = b.lat - a.lat
        const angle = Math.atan2(-dy, dx) * 180 / Math.PI
        L.marker([pLat, pLng], {
          icon: L.divIcon({
            className: '',
            html: `<span style="display:inline-block;transform:rotate(${angle}deg);color:${color};font-size:11px;opacity:0.85;text-shadow:0 0 3px var(--ink-900);">➤</span>`,
            iconSize: [0, 0],
          }),
          interactive: false,
        }).addTo(group)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLinks, connections.length, sages.length, mapReady])

  // ── Sync filter (dim non-matching markers) ───────────────────
  useEffect(() => {
    const map = mapObjRef.current as any
    if (!map?._sageMarkers) return
    const filteredIds = new Set(filteredSages.map(s => s.id))
    const noFilter    = filteredIds.size === sages.length

    map._sageMarkers.forEach((marker: import('leaflet').CircleMarker, id: string) => {
      marker.setStyle({
        fillOpacity: noFilter || filteredIds.has(id) ? 0.85 : 0.12,
        opacity:     noFilter || filteredIds.has(id) ? 1    : 0.2,
      })
    })
  }, [filteredSages, sages.length])

  // ── Pan to selected sage ─────────────────────────────────────
  // חשוב: רק כשהטאב גלוי. flyTo על מפה מוסתרת (גודל 0) זורק
  // "Invalid LatLng (NaN)" ומפיל את כל האפליקציה בעת לחיצה על חכם.
  useEffect(() => {
    if (activeTab !== 'map') return
    if (!selectedSageId || !mapObjRef.current) return
    const el = mapRef.current
    if (!el || el.clientWidth < 50 || el.clientHeight < 50) return
    const map = mapObjRef.current as any
    const marker = map._sageMarkers?.get(selectedSageId)
    if (!marker) return
    try {
      map.invalidateSize()
      const ll = marker.getLatLng()
      map.flyTo(ll, Math.max(map.getZoom(), 6), { duration: 1 })
      // Open after the fly ends — at low zoom the marker may still be
      // clustered until zoomend re-adds the individual markers layer
      setTimeout(() => { try { marker.openPopup() } catch { /* noop */ } }, 1100)
    } catch {
      /* hidden/zero-size map — safely ignore */
    }
  }, [selectedSageId, activeTab])

  // ── Swap tile style when the theme changes ───────────────────
  useEffect(() => {
    const map = mapObjRef.current as any
    if (!map?._tileLayer) return
    map._tileLayer.setUrl(
      `https://{s}.basemaps.cartocdn.com/${theme === 'light' ? 'light_nolabels' : 'dark_nolabels'}/{z}/{x}/{y}{r}.png`)
  }, [theme])

  // ── Invalidate map size when tab becomes visible ─────────────
  useEffect(() => {
    if (activeTab !== 'map') return
    const t = setTimeout(() => {
      try { mapObjRef.current?.invalidateSize() } catch { /* noop */ }
    }, 120)
    return () => clearTimeout(t)
  }, [activeTab])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Connection lines toggle */}
      <div className="absolute top-4 end-4 z-20">
        <button
          onClick={() => setShowLinks(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-sans border transition-all shadow-glass',
            showLinks
              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
              : 'glass border-ink-700/50 text-ink-400 hover:text-ink-200',
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          {tr(locale, 'קשרים', 'Connections', 'Связи')}
        </button>
      </div>

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען מפה...', 'Loading map...', 'Загрузка карты...')}
          </p>
        </div>
      )}
    </div>
  )
}
```

## FILE: components/viz/MapLegend.tsx

_(79 lines)_

```tsx
'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, ALL_PERIODS } from '@/lib/types'
import type { Locale, Period, Region } from '@/lib/types'
import { cn } from '@/lib/utils'

const ERAS: Period[] = ALL_PERIODS
const REGIONS: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach',
]

/**
 * מקרא למפה — צבעי הסמנים לפי תקופה + אזורים, לחיצה על שורה מסננת
 * (מתואם עם מנוע הסינון הכללי — אותו סינון חל גם על רשת הקשרים).
 */
export function MapLegend({ locale }: { locale: Locale }) {
  const isHe = locale === 'he'
  const [collapsed, setCollapsed] = useState(false)
  const { filters, togglePeriodFilter, toggleRegionFilter, clearFilters, filteredSages, sages } = useAppStore()
  const active = filters.period.length + filters.region.length + filters.field.length > 0

  const Row = ({ color, label, on, onClick }: {
    color: string; label: string; on: boolean; onClick: () => void
  }) => (
    <button onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full px-1.5 py-0.5 rounded-md text-start transition-all',
        on ? 'bg-gold-500/20' : 'hover:bg-ink-700/40',
      )}>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border"
        style={{ background: color, borderColor: on ? 'var(--gold-500)' : 'transparent' }} />
      <span className={cn('text-[10.5px] font-sans whitespace-nowrap',
        on ? 'text-gold-300 font-bold' : 'text-ink-300')}>{label}</span>
    </button>
  )

  return (
    <div className="absolute bottom-6 start-4 z-20 glass rounded-xl overflow-hidden min-w-[150px] max-h-[70vh] flex flex-col">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between gap-3 px-3 py-2 text-start hover:bg-ink-700/30 transition-colors flex-shrink-0"
      >
        <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400">
          {isHe ? 'מקרא וסינון' : 'Legend & Filter'}
        </span>
        <span className="text-ink-600 text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="px-2 pb-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 px-1.5 pt-1">
            {isHe ? 'תקופות' : 'Eras'}
          </p>
          {ERAS.map(era => (
            <Row key={era} color={ERA_COLORS[era]} label={ERA_LABELS[era]?.[locale] ?? era}
              on={filters.period.includes(era)} onClick={() => togglePeriodFilter(era)} />
          ))}
          <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 px-1.5 pt-2 border-t border-ink-700/40 mt-1">
            {isHe ? 'בתי מדרש ואזורים' : 'Regions'}
          </p>
          {REGIONS.map(region => (
            <Row key={region} color={REGION_COLORS[region]} label={REGION_LABELS[region]?.[locale] ?? region}
              on={filters.region.includes(region)} onClick={() => toggleRegionFilter(region)} />
          ))}
          {active && (
            <button onClick={clearFilters}
              className="mt-2 text-[10px] font-sans font-bold text-red-300 border border-red-400/50 rounded-lg px-2 py-1 hover:bg-red-500/15 transition-all">
              ✕ {isHe ? `נקה סינון (${filteredSages.length}/${sages.length})` : `Clear (${filteredSages.length}/${sages.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

## FILE: components/viz/NetworkGraph.tsx

_(812 lines)_

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS, CONNECTION_LABELS, ALL_PERIODS } from '@/lib/types'
import { MILESTONES } from '@/lib/milestones'
import { tr } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import { PathFinder } from '@/components/viz/PathFinder'
import type { Locale, Period, Region } from '@/lib/types'
import { locationToRegion, regionsOf } from '@/lib/regions'

type ColorMode = 'era' | 'region'

const CONNECTION_COLORS: Record<string, string> = {
  student:      '#3b82f6',
  teacher:      '#3b82f6',
  influence:    '#f59e0b',
  colleague:    '#22c55e',
  oppose:       '#ef4444',
  family:       '#a855f7',
  contemporary: '#14b8a6',
  predecessor:  '#64748b',
}

const CONNECTION_DASH: Record<string, string | null> = {
  student:      null,
  teacher:      null,
  influence:    '7,4',
  colleague:    '3,4',
  oppose:       '3,3',
  contemporary: '2,4',
  predecessor:  null,
}

const ERA_ORDER: Record<string, number> = {
  patriarchs: 0, exodus: 1, judges: 2, kings: 3,
  'second-temple': 4, tannaim: 5, amoraim: 6, geonim: 7,
  rishonim: 8, acharonim: 9, modern: 10,
}
const ERA_COUNT = 11

function nodeColor(d: any, mode: ColorMode): string {
  const eraColor = ERA_COLORS[d.period as Period] ?? '#7a6550'
  if (mode === 'era') return eraColor
  const region: Region | null = d.region ?? locationToRegion(d.location)
  return (region && REGION_COLORS[region]) ? REGION_COLORS[region] : eraColor
}

function gradId(id: string) { return `grad-mig-${id}` }

interface NetworkGraphProps { locale: Locale }

export function NetworkGraph({ locale }: NetworkGraphProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const svgElRef      = useRef<SVGSVGElement | null>(null)
  const simRef        = useRef<import('d3').Simulation<any, any> | null>(null)
  const zoomRef       = useRef<import('d3').ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const nodeSelRef    = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const linkSelRef    = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const labelSelRef   = useRef<import('d3').Selection<any, any, any, any> | null>(null)
  const colorModeRef  = useRef<ColorMode>('region')
  const filteredIdsRef = useRef<Set<string> | null>(null)   // hover restores per-filter dim
  const dimsRef = useRef<{ W: number; H: number }>({ W: 800, H: 600 })
  const tooltipRef    = useRef<HTMLDivElement | null>(null)

  const [colorMode, setColorMode] = useState<ColorMode>('region')
  const [showPathFinder, setShowPathFinder] = useState(false)
  // Clicked edge → relationship detail card (masterplan §2: clickable edges)
  const [edgeInfo, setEdgeInfo] = useState<{ sourceId: string; targetId: string; type: string } | null>(null)

  const { sages, connections, selectSage, filteredSages, selectedSageId, sageMap } = useAppStore()

  // Mirror state → ref so D3 closures always read the latest value
  useEffect(() => { colorModeRef.current = colorMode }, [colorMode])

  // ── Build graph ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true

    async function build() {
      const d3 = await import('d3')
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      const W = container.clientWidth  || 800
      const H = container.clientHeight || 600
      dimsRef.current = { W, H }

      d3.select(container).selectAll('svg').remove()
      simRef.current?.stop()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background', 'transparent')

      svgElRef.current = svg.node()

      // ── SVG defs: arrowheads + gradients ────────────────────────────────
      const defs = svg.append('defs')

      // Arrowhead marker for directed links (teacher→student, predecessor)
      const arrowTypes = ['student', 'teacher', 'predecessor'] as const
      arrowTypes.forEach(type => {
        const color = CONNECTION_COLORS[type] || '#5a4a38'
        defs.append('marker')
          .attr('id',          `arrow-${type}`)
          .attr('viewBox',     '0 -5 10 10')
          .attr('refX',        14)
          .attr('refY',        0)
          .attr('markerWidth', 6)
          .attr('markerHeight',6)
          .attr('orient',      'auto')
          .append('path')
          .attr('d',    'M0,-5L10,0L0,5')
          .attr('fill', color)
          .attr('opacity', 0.8)
      })
      filteredSages.forEach(sage => {
        // דו-צבעי: migration_path אם קיים, אחרת אזורים מתוך טקסט המיקום
        let fromR = sage.migration_path ? locationToRegion(sage.migration_path.from) : null
        let toR   = sage.migration_path ? locationToRegion(sage.migration_path.to)   : null
        if (!fromR || !toR || fromR === toR) {
          const regs = regionsOf(sage.location)
          if (regs.length >= 2) { fromR = regs[0]; toR = regs[regs.length - 1] }
        }
        if (!fromR || !toR || fromR === toR) return
        const c0 = REGION_COLORS[fromR]
        const c1 = REGION_COLORS[toR]

        const grad = defs.append('linearGradient')
          .attr('id', gradId(sage.id))
          .attr('gradientUnits', 'objectBoundingBox')
          .attr('x1', '0').attr('y1', '0')
          .attr('x2', '0').attr('y2', '1')
        // 50/50 hard split — מוצא למעלה, יעד למטה (כמו בטבלה המודפסת)
        grad.append('stop').attr('offset', '50%').attr('stop-color', c0)
        grad.append('stop').attr('offset', '50%').attr('stop-color', c1)
      })

      const g = svg.append('g')

      // ── Historical milestone bars (static, behind links/nodes) ───────────
      // Shared MILESTONES (lib/milestones.ts) incl. ancient events; year shown.
      const ERA_RANGES_EV: Record<string, [number, number]> = {
        patriarchs: [-1850, -1500], exodus: [-1500, -1200],
        judges: [-1200, -1020], kings: [-1020, -350],
        'second-temple': [-350, 70], tannaim: [70, 220], amoraim: [220, 500],
        geonim: [500, 1038], rishonim: [1038, 1492], acharonim: [1492, 1810], modern: [1810, 2030],
      }
      const ERAS_EV = ['patriarchs','exodus','judges','kings',
        'second-temple','tannaim','amoraim','geonim','rishonim','acharonim','modern']
      const eraXOf = (k: string) => (W * 0.05) + (ERA_ORDER[k] ?? 3) * (W * 0.9 / (ERA_COUNT - 1))
      const evBarsG = g.append('g').attr('pointer-events', 'none')
      MILESTONES.forEach((ev, idx) => {
        const era = ERAS_EV.find(k => { const [s,e] = ERA_RANGES_EV[k]; return ev.year >= s && ev.year < e })
        if (!era) return
        const i  = ERAS_EV.indexOf(era)
        const [es, ee] = ERA_RANGES_EV[era]
        const f  = (ev.year - es) / (ee - es)
        const x0 = eraXOf(era)
        const x1 = ERAS_EV[i + 1] ? eraXOf(ERAS_EV[i + 1]) : x0 + W * 0.15
        const x  = x0 + f * (x1 - x0)
        const row = idx % 4
        const ly  = 16 + row * 14
        const yearTxt = ev.year < 0
          ? `${Math.abs(ev.year)}${tr(locale, ' לפנה"ס', ' BCE', ' до н.э.')}`
          : `${ev.year}`

        evBarsG.append('rect').attr('x', x - 1.5).attr('y', 0)
          .attr('width', 3).attr('height', H).attr('rx', 1.5)
          .attr('fill', '#e53935').attr('opacity', 0.10)
        evBarsG.append('line')
          .attr('x1', x).attr('y1', ly + 2).attr('x2', x).attr('y2', 56)
          .attr('stroke', '#e57373').attr('stroke-width', 1).attr('opacity', 0.4)
        evBarsG.append('text').attr('x', x).attr('y', ly)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', '8px').attr('font-weight', '700')
          .attr('fill', '#c62828')
          .style('stroke', 'var(--ink-900)').attr('stroke-width', 2.5).attr('paint-order', 'stroke')
          .text(`${ev.label[locale]} · ${yearTxt}`)
      })

      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.05, 4])
        .on('zoom', ev => g.attr('transform', ev.transform))
      svg.call(zoom)
      zoomRef.current = zoom

      // ── Data prep ────────────────────────────────────────────────────────
      const nodes = filteredSages.map(s => ({ ...s, degree: 0 }))
      const nodeById = new Map(nodes.map(n => [n.id, n]))

      // Store filtered sage IDs for opacity logic during hover
      filteredIdsRef.current = new Set(filteredSages.map(s => s.id))

      const sortedLinks = [...connections].sort((a, b) => {
        const score = (t: string) =>
          t === 'student' || t === 'teacher' ? 3 :
          t === 'influence' || t === 'colleague' ? 2 : 1
        return score(b.type) - score(a.type)
      }).slice(0, 400)

      sortedLinks.forEach(l => {
        const s = nodeById.get(l.source); if (s) s.degree++
        const t = nodeById.get(l.target); if (t) t.degree++
      })

      const links = sortedLinks
        .filter(l => nodeById.has(l.source) && nodeById.has(l.target))
        .map(l => ({ ...l }))

      const adj = new Map<string, Set<string>>()
      links.forEach(l => {
        if (!adj.has(l.source)) adj.set(l.source, new Set())
        if (!adj.has(l.target)) adj.set(l.target, new Set())
        adj.get(l.source)!.add(l.target)
        adj.get(l.target)!.add(l.source)
      })

      const r = (d: any) => Math.min(22, 5 + Math.sqrt(d.degree || 0) * 2.2)

      const eraX = (period: string) => {
        const idx = ERA_ORDER[period] ?? 5
        return (W * 0.05) + idx * (W * 0.9 / (ERA_COUNT - 1))
      }

      // ── Force simulation ─────────────────────────────────────────────────
      const sim = d3.forceSimulation(nodes as any)
        .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(75).strength(0.35))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('x', d3.forceX((d: any) => eraX(d.period)).strength(0.14))
        .force('y', d3.forceY(H / 2).strength(0.05))
        .force('collide', d3.forceCollide((d: any) => r(d) + 5).strength(0.9))

      simRef.current = sim

      // ── Links ────────────────────────────────────────────────────────────
      const DIRECTED = new Set(['teacher', 'student', 'predecessor'])

      const linkG = g.append('g').attr('class', 'links')
      const link  = linkG.selectAll('path')
        .data(links).join('path')
        .attr('fill', 'none')
        .attr('stroke', (d: any) => CONNECTION_COLORS[d.type] || '#5a4a38')
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.22)
        .attr('stroke-dasharray', (d: any) => CONNECTION_DASH[d.type] || null)
        .attr('marker-end', (d: any) =>
          DIRECTED.has(d.type) ? `url(#arrow-${d.type})` : null)

      linkSelRef.current = link

      // Invisible wide hit-area paths — make edges hoverable & clickable
      const hitLink = linkG.selectAll<SVGPathElement, any>('path.hit')
        .data(links).join('path')
        .attr('class', 'hit')
        .attr('fill', 'none')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 13)
        .style('cursor', 'pointer')

      // Color fill helper (reads from colorModeRef so no rebuild needed on toggle)
      const isMigrant = (d: any): boolean => {
        if (d.migration_path) {
          const fromR = locationToRegion(d.migration_path.from)
          const toR   = locationToRegion(d.migration_path.to)
          if (fromR && toR && fromR !== toR) return true
        }
        return regionsOf(d.location).length >= 2
      }
      const fillOf = (d: any) => {
        const mode = colorModeRef.current
        if (mode === 'region' && isMigrant(d)) return `url(#${gradId(d.id)})`
        return nodeColor(d, mode)
      }

      // ── Nodes ────────────────────────────────────────────────────────────
      const nodeG = g.append('g').attr('class', 'nodes')
      const node  = nodeG.selectAll<SVGCircleElement, any>('circle')
        .data(nodes).join('circle')
        .attr('r', r)
        .attr('fill', fillOf)
        .style('stroke', 'var(--ink-900)')
        .attr('stroke-width', 1.5)
        .attr('fill-opacity', 0.88)
        .style('cursor', 'pointer')

      nodeSelRef.current = node

      // ── Labels ───────────────────────────────────────────────────────────
      const labelG = g.append('g').attr('class', 'labels')
      const label  = labelG.selectAll('text')
        .data(nodes).join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => `-${r(d) + 4}px`)
        .attr('font-family', 'Heebo, sans-serif')
        .attr('font-size', '10px')
        .attr('font-weight', '500')
        .style('fill', 'var(--ink-100)')
        .style('stroke', 'var(--ink-900)')
        .attr('stroke-width', 2.5)
        .attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .attr('opacity', 0)
        .text((d: any) => {
          // שנים לצד השם — "סימון שנים ברשת הקשרים"
          const y = [d.birth_year, d.death_year].filter(Boolean)
            .map((v: number) => v < 0 ? `${Math.abs(v)}${tr(locale, ' לפנה"ס', ' BCE', ' до н.э.')}` : `${v}`)
          return y.length ? `${d.label || ''} · ${y.join('–')}` : (d.label || '')
        })

      labelSelRef.current = label

      // ── Drag ─────────────────────────────────────────────────────────────
      const drag = d3.drag<SVGCircleElement, any>()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      node.call(drag as any)

      // ── Hover (Connected Papers style) + tooltip ─────────────────────────
      const showTooltip = (ev: MouseEvent, d: any) => {
        const tip = tooltipRef.current
        if (!tip) return
        const color  = ERA_COLORS[d.period as Period] ?? '#7a6550'
        const degree = (adj.get(d.id)?.size ?? 0)
        const years  = [d.birth_year, d.death_year].filter(Boolean)
        tip.innerHTML = `
          <div style="font-family:'Frank Ruhl Libre',serif;font-size:15px;font-weight:700;
               color:var(--ink-100);margin-bottom:3px;">${d.label ?? ''}</div>
          ${d.name_en ? `<div style="font-size:11px;color:var(--ink-300);margin-bottom:5px;">${d.name_en}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
            <span style="font-size:10px;padding:1px 7px;border-radius:9999px;
              background:${color}22;color:${color};border:1px solid ${color}44;">
              ${ERA_LABELS[d.period as Period]?.[locale] ?? d.period}
            </span>
            ${degree ? `<span style="font-size:10px;padding:1px 7px;border-radius:9999px;
              background:rgba(201,151,58,0.15);color:#c9973a;border:1px solid rgba(201,151,58,0.3);">
              ${degree} ${tr(locale, 'קשרים', 'links', 'связей')}</span>` : ''}
          </div>
          ${d.location ? `<div style="font-size:10px;color:var(--ink-400);">📍 ${d.location}</div>` : ''}
          ${d.field    ? `<div style="font-size:10px;color:var(--ink-400);">◈ ${d.field}</div>` : ''}
          ${years.length ? `<div style="font-size:10px;color:var(--ink-500);margin-top:2px;">${years.join(' – ')}</div>` : ''}
        `
        tip.style.display = 'block'
        tip.style.left = `${ev.clientX + 14}px`
        tip.style.top  = `${ev.clientY - 10}px`
      }

      const hideTooltip = () => {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
      }

      // דהיית בסיס לפי הסינון הפעיל — hover לא מאפס את הסינון
      const baseOpacity = (n: any) =>
        !filteredIdsRef.current || filteredIdsRef.current.has(n.id) ? 0.88 : 0.06

      node
        .on('mouseover', (ev: MouseEvent, d: any) => {
          const nb = adj.get(d.id) || new Set()
          node.transition().duration(150)
            .attr('fill-opacity', (n: any) => {
              const inFilter = !filteredIdsRef.current || filteredIdsRef.current.has(n.id)
              if (n.id === d.id || nb.has(n.id)) return inFilter ? 1 : 0.3
              return 0.05
            })
            .attr('r',            (n: any) => n.id === d.id ? r(n) + 3 : r(n))
          link.transition().duration(150)
            .attr('stroke-opacity', (l: any) =>
              l.source.id === d.id || l.target.id === d.id ? 0.85 : 0.02)
          label.transition().duration(150)
            .attr('opacity', (n: any) => n.id === d.id || nb.has(n.id) ? 1 : 0)
          showTooltip(ev, d)
        })
        .on('mousemove', (ev: MouseEvent) => {
          const tip = tooltipRef.current
          if (!tip) return
          tip.style.left = `${ev.clientX + 14}px`
          tip.style.top  = `${ev.clientY - 10}px`
        })
        .on('mouseout', () => {
          // משחזר את מצב הסינון (לא מאפס ל-0.88 גורף)
          node.transition().duration(300).attr('fill-opacity', (n: any) => baseOpacity(n)).attr('r', r)
          link.transition().duration(300).attr('stroke-opacity', 0.22)
          label.transition().duration(300).attr('opacity', 0)
          hideTooltip()
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          hideTooltip()
          const sage = sages.find(s => s.id === d.id)
          if (sage) selectSage(sage)
        })

      // ── Edge hover + click (relationship details) ────────────────────────
      hitLink
        .on('mouseover', (_ev: MouseEvent, d: any) => {
          link.transition().duration(120)
            .attr('stroke-opacity', (l: any) => l === d ? 0.95 : 0.04)
            .attr('stroke-width',   (l: any) => l === d ? 2.6  : 1.2)
          node.transition().duration(120)
            .attr('fill-opacity', (n: any) =>
              n.id === d.source.id || n.id === d.target.id ? 1 : 0.08)
          label.transition().duration(120)
            .attr('opacity', (n: any) =>
              n.id === d.source.id || n.id === d.target.id ? 1 : 0)
        })
        .on('mouseout', () => {
          link.transition().duration(250)
            .attr('stroke-opacity', 0.22).attr('stroke-width', 1.2)
          node.transition().duration(250)
            .attr('fill-opacity', (n: any) => baseOpacity(n))
          label.transition().duration(250).attr('opacity', 0)
        })
        .on('click', (ev: MouseEvent, d: any) => {
          ev.stopPropagation()
          setEdgeInfo({
            sourceId: typeof d.source === 'object' ? d.source.id : d.source,
            targetId: typeof d.target === 'object' ? d.target.id : d.target,
            type: d.type,
          })
        })

      // ── Tick ─────────────────────────────────────────────────────────────
      const linkPath = (d: any) => {
        const sx = d.source.x, sy = d.source.y
        const tx = d.target.x, ty = d.target.y
        const mx = (sx + tx) / 2, my = (sy + ty) / 2
        const dx = tx - sx, dy = ty - sy
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const ox = -dy / dist * 18
        const oy =  dx / dist * 18
        return `M${sx},${sy} Q${mx + ox},${my + oy} ${tx},${ty}`
      }
      sim.on('tick', () => {
        link.attr('d', linkPath)
        hitLink.attr('d', linkPath)
        node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
        label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
      })
    }

    build()

    // Zoom-to-fit once after simulation settles (~2s)
    const fitTimer = setTimeout(() => {
      if (!mounted || !svgElRef.current || !zoomRef.current || !nodeSelRef.current) return
      import('d3').then(d3 => {
        if (!svgElRef.current || !zoomRef.current || !nodeSelRef.current) return
        const cW = svgElRef.current.clientWidth  || 800
        const cH = svgElRef.current.clientHeight || 600
        const pts = nodeSelRef.current.data() as any[]
        const xs  = pts.map(d => d.x as number).filter(isFinite)
        const ys  = pts.map(d => d.y as number).filter(isFinite)
        if (xs.length < 2) return
        const x0 = Math.min(...xs), x1 = Math.max(...xs)
        const y0 = Math.min(...ys), y1 = Math.max(...ys)
        const pad = 60
        const scale = Math.min(
          (cW - pad * 2) / Math.max(1, x1 - x0),
          (cH - pad * 2) / Math.max(1, y1 - y0),
          1.2,
        )
        const tx = cW / 2 - scale * (x0 + x1) / 2
        const ty = cH / 2 - scale * (y0 + y1) / 2
        d3.select(svgElRef.current)
          .transition().duration(800)
          .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
      })
    }, 2000)

    return () => { mounted = false; simRef.current?.stop(); clearTimeout(fitTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length, connections.length])

  // ── Sync color mode (no graph rebuild) ──────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    nodeSelRef.current.transition().duration(400)
      .attr('fill', (d: any) => {
        if (colorMode === 'region') {
          const mig = d.migration_path
          const fromR = mig ? locationToRegion(mig.from) : null
          const toR   = mig ? locationToRegion(mig.to)   : null
          if ((fromR && toR && fromR !== toR) || regionsOf(d.location).length >= 2) {
            return `url(#${gradId(d.id)})`
          }
        }
        return nodeColor(d, colorMode)
      })
  }, [colorMode])

  // ── Sync filter dim + zoom-to-fit ────────────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    const ids      = new Set(filteredSages.map(s => s.id))
    const noFilter = ids.size === sages.length
    filteredIdsRef.current = noFilter ? null : ids
    nodeSelRef.current.transition().duration(250)
      .attr('fill-opacity', (d: any) => noFilter || ids.has(d.id) ? 0.88 : 0.06)

    // ריכוז למרכז (כמו באתר הקלאסי): המסוננים נמשכים לרצועת האמצע,
    // ציר התקופות (forceX) נשמר — כך הקבוצה מתקבצת אך לא מאבדת כרונולוגיה
    if (simRef.current) {
      import('d3').then(d3 => {
        const sim = simRef.current
        if (!sim) return
        const H = dimsRef.current.H
        sim.force('y', d3.forceY(H / 2).strength((d: any) =>
          noFilter ? 0.05 : ids.has(d.id) ? 0.28 : 0.02))
        sim.force('charge', d3.forceManyBody().strength((d: any) =>
          noFilter ? -120 : ids.has(d.id) ? -160 : -40))
        sim.alpha(0.45).restart()
      })
    }

    // Zoom-to-fit when filter narrows down to a manageable subset
    if (!noFilter && filteredSages.length > 0 && filteredSages.length < sages.length * 0.5
        && svgElRef.current && zoomRef.current && nodeSelRef.current) {
      import('d3').then(d3 => {
        if (!svgElRef.current || !zoomRef.current || !nodeSelRef.current) return
        const cW = svgElRef.current.clientWidth  || 800
        const cH = svgElRef.current.clientHeight || 600
        const visible = (nodeSelRef.current.data() as any[]).filter(d => ids.has(d.id))
        const xs = visible.map(d => d.x as number).filter(isFinite)
        const ys = visible.map(d => d.y as number).filter(isFinite)
        if (xs.length < 2) return
        const x0 = Math.min(...xs), x1 = Math.max(...xs)
        const y0 = Math.min(...ys), y1 = Math.max(...ys)
        const pad = 80
        const scale = Math.min(
          (cW - pad * 2) / Math.max(1, x1 - x0),
          (cH - pad * 2) / Math.max(1, y1 - y0),
          3,
        )
        const tx = cW / 2 - scale * (x0 + x1) / 2
        const ty = cH / 2 - scale * (y0 + y1) / 2
        d3.select(svgElRef.current)
          .transition().duration(700)
          .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
      })
    }
  }, [filteredSages, sages.length])

  // ── Sync selection ring ──────────────────────────────────────────────────
  useEffect(() => {
    if (!nodeSelRef.current) return
    nodeSelRef.current
      .style('stroke',      (d: any) => d.id === selectedSageId ? 'var(--gold-500)' : 'var(--ink-900)')
      .attr('stroke-width', (d: any) => d.id === selectedSageId ? 3 : 1.5)
    labelSelRef.current?.attr('opacity', (d: any) => d.id === selectedSageId ? 1 : 0)
  }, [selectedSageId])

  const zoomBy = (k: number) => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 =>
      d3.select(svgElRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, k))
  }
  const zoomReset = () => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 =>
      d3.select(svgElRef.current!).transition().duration(500).call(zoomRef.current!.transform, d3.zoomIdentity))
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Tooltip — positioned by D3 mouse events */}
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'fixed', zIndex: 50, pointerEvents: 'none',
          maxWidth: 220, padding: '8px 12px',
          background: 'var(--ink-850)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(201,151,58,0.2)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      />

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען רשת...', 'Loading network...', 'Загрузка сети...')}
          </p>
        </div>
      )}

      <GraphLegend locale={locale} colorMode={colorMode} setColorMode={setColorMode} />

      {/* Edge relationship card — opens on edge click */}
      {edgeInfo && (() => {
        const src = sageMap.get(edgeInfo.sourceId)
        const tgt = sageMap.get(edgeInfo.targetId)
        if (!src || !tgt) return null
        const typeColor = CONNECTION_COLORS[edgeInfo.type] ?? '#c9973a'
        const typeLabel = CONNECTION_LABELS[edgeInfo.type as keyof typeof CONNECTION_LABELS]?.[locale] ?? edgeInfo.type
        return (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 glass rounded-xl border border-gold-500/25 shadow-glass-lg px-4 py-3 w-[340px] max-w-[calc(100vw-32px)] animate-fade-in">
            <button
              onClick={() => setEdgeInfo(null)}
              className="absolute top-2 end-2 text-ink-500 hover:text-ink-200 transition-colors"
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-2">
              {tr(locale, 'מהות הקשר', 'Relationship', 'Характер связи')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { selectSage(src); setEdgeInfo(null) }}
                className="flex-1 min-w-0 text-start px-2.5 py-1.5 rounded-lg bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40 transition-colors"
              >
                <span className="text-sm font-serif text-ink-100 truncate block">{src.label}</span>
              </button>
              <span
                className="flex-shrink-0 text-[10px] font-sans font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}55` }}
              >
                {typeLabel}
              </span>
              <button
                onClick={() => { selectSage(tgt); setEdgeInfo(null) }}
                className="flex-1 min-w-0 text-start px-2.5 py-1.5 rounded-lg bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40 transition-colors"
              >
                <span className="text-sm font-serif text-ink-100 truncate block">{tgt.label}</span>
              </button>
            </div>
          </div>
        )
      })()}

      {/* PathFinder panel — top-end corner */}
      {showPathFinder && (
        <div className="absolute top-4 end-4 z-20 animate-fade-in">
          <PathFinder locale={locale} onClose={() => setShowPathFinder(false)} />
        </div>
      )}

      {/* Zoom + PathFinder toggle cluster */}
      <div className="absolute bottom-20 end-4 z-10 flex flex-col gap-1.5">
        <ZoomBtn onClick={() => zoomBy(1.5)} label="+">+</ZoomBtn>
        <ZoomBtn onClick={zoomReset} label="⊙">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={() => zoomBy(0.67)} label="−">−</ZoomBtn>
        <div className="h-px bg-ink-700/50 my-0.5" />
        <button
          onClick={() => setShowPathFinder(p => !p)}
          aria-label={tr(locale, 'מוצא מסלול', 'Path Finder', 'Поиск пути')}
          title={tr(locale, 'מוצא מסלול', 'Path Finder', 'Поиск пути')}
          className={cn(
            'w-11 h-11 md:w-8 md:h-8 rounded-lg text-xs font-mono glass border transition-all',
            'flex items-center justify-center',
            showPathFinder
              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300 shadow-gold-glow'
              : 'border-ink-600/40 text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
          )}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ZoomBtn({ onClick, children, label }: {
  onClick: () => void; children: React.ReactNode; label: string
}) {
  return (
    <button onClick={onClick} aria-label={label} className={cn(
      'w-11 h-11 md:w-8 md:h-8 rounded-lg text-sm font-mono glass border border-ink-600/40',
      'text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
      'transition-all flex items-center justify-center',
    )}>
      {children}
    </button>
  )
}

const ERAS_LIST: Period[] = ALL_PERIODS
const REGIONS_LIST: Region[] = [
  'eretz-israel', 'sefarad', 'ashkenaz', 'east-europe',
  'tsarfat', 'provence', 'italy', 'north-africa', 'mizrach', 'other',
]

function GraphLegend({ locale, colorMode, setColorMode }: {
  locale: Locale; colorMode: ColorMode; setColorMode: (m: ColorMode) => void
}) {
  const isHe = locale === 'he'
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div
      data-tour="legend"
      className={cn(
        'absolute top-4 start-4 z-10',
        'glass rounded-xl overflow-hidden',
        'flex flex-col min-w-[140px]',
      )}>
      {/* Title bar (always visible) */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between gap-3 px-3 py-2 text-start hover:bg-ink-700/30 transition-colors"
      >
        <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-400">
          {isHe ? 'מקרא' : 'Legend'}
        </span>
        <span className="text-ink-600 text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-3 pb-3 flex flex-col gap-1.5 max-h-[calc(100vh-160px)] overflow-y-auto">
          {/* Color mode toggle */}
          <div className="flex gap-1 bg-ink-800/60 rounded-lg p-0.5 mb-0.5">
            {(['era', 'region'] as ColorMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setColorMode(mode)}
                className={cn(
                  'flex-1 text-[10px] font-sans font-semibold rounded-md px-2 py-1 transition-all',
                  colorMode === mode
                    ? 'bg-gold-500/25 text-gold-300 shadow-inner'
                    : 'text-ink-500 hover:text-ink-200',
                )}
              >
                {mode === 'era' ? (isHe ? 'תקופה' : 'Era') : (isHe ? 'אזור' : 'Region')}
              </button>
            ))}
          </div>

          {/* Era legend */}
          {colorMode === 'era' && ERAS_LIST.map(era => (
            <div key={era} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ERA_COLORS[era] }} />
              <span className="text-[10px] font-sans text-ink-300 whitespace-nowrap">{ERA_LABELS[era]?.[locale]}</span>
            </div>
          ))}

          {/* Region legend */}
          {colorMode === 'region' && (
            <>
              {REGIONS_LIST.map(region => (
                <div key={region} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: REGION_COLORS[region] }} />
                  <span className="text-[10px] font-sans text-ink-300 whitespace-nowrap">{REGION_LABELS[region]?.[locale]}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-ink-700/40 pt-1.5 mt-0.5">
                <span className="w-2.5 h-3.5 rounded-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(to bottom, #1e88e5 0%, #43a047 100%)' }} />
                <span className="text-[10px] font-sans text-ink-400 leading-tight">{isHe ? 'חכם נודד' : 'Migrating'}</span>
              </div>
            </>
          )}

          {/* Connection types */}
          <div className="border-t border-ink-700/40 pt-2 mt-1 space-y-1.5">
            <p className="text-[9px] font-sans font-semibold uppercase tracking-widest text-ink-600 mb-1">
              {isHe ? 'סוגי קשרים' : 'Links'}
            </p>
            {(Object.entries(CONNECTION_COLORS) as [string, string][])
              .filter(([k]) => k !== 'family')
              .map(([type, color]) => {
                const dash = CONNECTION_DASH[type]
                const directed = type === 'teacher' || type === 'student' || type === 'predecessor'
                return (
                  <div key={type} className="flex items-center gap-2">
                    <svg width="28" height="10" className="flex-shrink-0" style={{ overflow: 'visible' }}>
                      <line x1="2" y1="5" x2={directed ? 22 : 26} y2="5"
                        stroke={color} strokeWidth="1.5" opacity="0.75"
                        strokeDasharray={dash ?? undefined} />
                      {directed && <polygon points="22,2.5 27,5 22,7.5" fill={color} opacity="0.75" />}
                    </svg>
                    <span className="text-[10px] font-sans text-ink-400 whitespace-nowrap">
                      {CONNECTION_LABELS[type as keyof typeof CONNECTION_LABELS]?.[locale] ?? type}
                    </span>
                  </div>
                )
              })}
            {/* Event bar indicator */}
            <div className="flex items-center gap-2 border-t border-ink-700/40 pt-1.5 mt-0.5">
              <svg width="28" height="10" className="flex-shrink-0">
                <rect x="12" y="0" width="3" height="10" rx="1" fill="#e53935" opacity="0.5" />
              </svg>
              <span className="text-[10px] font-sans text-ink-400 whitespace-nowrap">
                {isHe ? 'אירוע היסטורי' : 'Historical event'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## FILE: components/viz/PathFinder.tsx

_(302 lines)_

```tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import type { Locale, Sage, Connection } from '@/lib/types'
import { tr } from '@/lib/i18n'

interface PathStep {
  sage: Sage
  connectionType?: string   // connection TO this node from previous
}

function bfs(
  sourceId: string,
  targetId: string,
  connections: Connection[],
  sageMap: Map<string, Sage>,
): PathStep[] | null {
  if (sourceId === targetId) {
    const s = sageMap.get(sourceId)
    return s ? [{ sage: s }] : null
  }

  // Bidirectional adjacency
  const adj = new Map<string, Array<{ id: string; type: string }>>()
  connections.forEach(c => {
    if (!adj.has(c.source)) adj.set(c.source, [])
    if (!adj.has(c.target)) adj.set(c.target, [])
    adj.get(c.source)!.push({ id: c.target, type: c.type })
    adj.get(c.target)!.push({ id: c.source, type: c.type })
  })

  type QItem = { id: string; path: PathStep[] }
  const visited = new Set<string>([sourceId])
  const queue: QItem[] = [{ id: sourceId, path: [{ sage: sageMap.get(sourceId)! }] }]

  while (queue.length > 0) {
    const { id, path } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (visited.has(nb.id)) continue
      visited.add(nb.id)
      const sage = sageMap.get(nb.id)
      if (!sage) continue
      const newPath: PathStep[] = [...path, { sage, connectionType: nb.type }]
      if (nb.id === targetId) return newPath
      queue.push({ id: nb.id, path: newPath })
    }
  }
  return null
}

interface SagePickerProps {
  label: string
  value: Sage | null
  onChange: (s: Sage | null) => void
  locale: Locale
  exclude?: string
}

function SagePicker({ label, value, onChange, locale, exclude }: SagePickerProps) {
  const { sages } = useAppStore()
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = query.length >= 1
    ? sages
        .filter(s => s.id !== exclude)
        .filter(s =>
          s.label.includes(query) ||
          s.name_en?.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : []

  function pick(s: Sage) {
    onChange(s)
    setQuery(s.label)
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-ink-500 mb-1">
        {label}
      </p>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tr(locale, 'חפש חכם…', 'Search sage…', 'Поиск мудреца…')}
          className={cn(
            'w-full text-sm font-sans px-3 py-2 rounded-lg',
            'bg-ink-800/70 border text-ink-100 placeholder-ink-600',
            'focus:outline-none focus:border-gold-500/50',
            value ? 'border-gold-500/40' : 'border-ink-700/50',
          )}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        />
        {value && (
          <button
            onClick={clear}
            className="absolute top-1/2 -translate-y-1/2 end-2 text-ink-600 hover:text-ink-300 text-xs"
          >✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className={cn(
          'absolute z-50 w-full mt-1 rounded-lg overflow-hidden',
          'bg-ink-800 border border-ink-700/60',
          'shadow-glass-lg max-h-52 overflow-y-auto',
        )}>
          {results.map(s => {
            const color = ERA_COLORS[s.period] ?? '#7a6550'
            return (
              <li
                key={s.id}
                onMouseDown={() => pick(s)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-ink-700/60 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-sm font-serif text-ink-100 flex-1 truncate">{s.label}</span>
                <span className="text-[10px] font-sans text-ink-500 flex-shrink-0">
                  {ERA_LABELS[s.period]?.[locale]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface PathFinderProps {
  locale: Locale
  onClose: () => void
}

export function PathFinder({ locale, onClose }: PathFinderProps) {
  const { sages, connections, sageMap, selectSage } = useAppStore()
  const isHe = locale === 'he'

  const [sageA, setSageA] = useState<Sage | null>(null)
  const [sageB, setSageB] = useState<Sage | null>(null)
  const [path,  setPath]  = useState<PathStep[] | null | 'none'>('none')
  const [loading, setLoading] = useState(false)

  const search = useCallback(() => {
    if (!sageA || !sageB) return
    setLoading(true)
    setTimeout(() => {
      const result = bfs(sageA.id, sageB.id, connections, sageMap)
      setPath(result ?? null)
      setLoading(false)
    }, 0)
  }, [sageA, sageB, connections, sageMap])

  const degrees = Array.isArray(path) ? path.length - 1 : null

  return (
    <div className={cn(
      'glass rounded-2xl border border-ink-700/50 p-4',
      'flex flex-col gap-4 w-72',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-sm font-bold text-ink-100">
            {isHe ? 'מוצא מסלול' : 'Path Finder'}
          </h3>
          <p className="text-[10px] font-sans text-ink-500">
            {isHe ? 'כמה קשרים בין שני חכמים?' : 'Degrees of separation'}
          </p>
        </div>
        <button onClick={onClose}
          className="text-ink-600 hover:text-ink-300 transition-colors p-1 rounded-lg hover:bg-ink-700/50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Pickers */}
      <div className="space-y-3">
        <SagePicker
          label={isHe ? 'חכם א׳' : 'Sage A'}
          value={sageA}
          onChange={s => { setSageA(s); setPath('none') }}
          locale={locale}
          exclude={sageB?.id}
        />
        <div className="flex justify-center">
          <span className="text-ink-700 text-lg font-mono">↕</span>
        </div>
        <SagePicker
          label={isHe ? 'חכם ב׳' : 'Sage B'}
          value={sageB}
          onChange={s => { setSageB(s); setPath('none') }}
          locale={locale}
          exclude={sageA?.id}
        />
      </div>

      {/* Search button */}
      <button
        onClick={search}
        disabled={!sageA || !sageB || loading}
        className={cn(
          'w-full py-2 rounded-xl text-sm font-sans font-medium transition-all',
          sageA && sageB && !loading
            ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40 hover:bg-gold-500/30 hover:shadow-gold-glow'
            : 'bg-ink-800/50 text-ink-600 border border-ink-700/40 cursor-not-allowed',
        )}
      >
        {loading
          ? (isHe ? 'מחפש…' : 'Searching…')
          : (isHe ? 'מצא מסלול' : 'Find Path')}
      </button>

      {/* Result */}
      {path === null && (
        <div className="text-center text-sm font-sans text-ink-500 py-2">
          {isHe ? 'לא נמצא מסלול בין שני חכמים אלה' : 'No path found between these sages'}
        </div>
      )}

      {Array.isArray(path) && (
        <div className="space-y-2">
          {/* Degrees badge */}
          <div className="flex items-center justify-center gap-2 py-1">
            <span
              className="text-2xl font-mono font-bold"
              style={{ color: degrees === 1 ? '#27ae60' : degrees && degrees <= 3 ? '#f1c40f' : '#e67e22' }}
            >
              {degrees}
            </span>
            <span className="text-xs font-sans text-ink-400">
              {isHe ? (degrees === 1 ? 'קשר ישיר' : 'קשרים') : (degrees === 1 ? 'direct link' : 'degrees')}
            </span>
          </div>

          {/* Path chain */}
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {path.map((step, idx) => {
              const color = ERA_COLORS[step.sage.period] ?? '#7a6550'
              const connLabel = step.connectionType
                ? CONNECTION_LABELS[step.connectionType as keyof typeof CONNECTION_LABELS]?.[locale]
                : null

              return (
                <div key={step.sage.id}>
                  {/* Connection arrow */}
                  {idx > 0 && connLabel && (
                    <div className="flex items-center gap-2 px-2 py-0.5">
                      <div className="w-px h-4 bg-ink-700/60 ms-3 flex-shrink-0" />
                      <span className="text-[10px] font-sans text-ink-500 italic">{connLabel}</span>
                    </div>
                  )}
                  {/* Sage chip */}
                  <button
                    onClick={() => selectSage(step.sage)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                      bg-ink-800/50 hover:bg-ink-700/60 border border-ink-700/40
                      hover:border-ink-600/60 transition-all text-start group"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate">
                        {step.sage.label}
                      </p>
                      <p className="text-[10px] font-sans text-ink-500">
                        {ERA_LABELS[step.sage.period]?.[locale]}
                        {formatYearRange(step.sage.birth_year, step.sage.death_year)
                          ? ` · ${formatYearRange(step.sage.birth_year, step.sage.death_year)}`
                          : ''}
                      </p>
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

## FILE: components/viz/SagesTable.tsx

_(225 lines)_

```tsx
'use client'

import { useState, useMemo } from 'react'
import { ERA_COLORS, ERA_LABELS, CONNECTION_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Locale, Period, Sage } from '@/lib/types'

type SortKey = 'label' | 'period' | 'location' | 'field' | 'birth_year' | 'connections'
type SortDir = 'asc' | 'desc'

interface SagesTableProps { locale: Locale }

export function SagesTable({ locale }: SagesTableProps) {
  const { filteredSages, connections, selectSage, sages } = useAppStore()
  const isHe = locale === 'he'

  const [sortKey, setSortKey]   = useState<SortKey>('period')
  const [sortDir, setSortDir]   = useState<SortDir>('asc')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Degree map for connection count column
  const degreeMap = useMemo(() => {
    const m = new Map<string, number>()
    connections.forEach(c => {
      m.set(c.source, (m.get(c.source) ?? 0) + 1)
      m.set(c.target, (m.get(c.target) ?? 0) + 1)
    })
    return m
  }, [connections])

  const ERA_ORDER: Record<Period, number> = {
    patriarchs: 0, exodus: 1, judges: 2, kings: 3,
    'second-temple': 4, tannaim: 5, amoraim: 6, geonim: 7,
    rishonim: 8, acharonim: 9, modern: 10,
  }

  const sorted = useMemo(() => {
    return [...filteredSages].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'label':
          cmp = (a.label ?? '').localeCompare(b.label ?? '', 'he')
          break
        case 'period':
          cmp = (ERA_ORDER[a.period] ?? 9) - (ERA_ORDER[b.period] ?? 9)
          break
        case 'location':
          cmp = (a.location ?? '').localeCompare(b.location ?? '', 'he')
          break
        case 'field':
          cmp = (a.field ?? '').localeCompare(b.field ?? '', 'he')
          break
        case 'birth_year':
          cmp = (a.birth_year ?? a.death_year ?? 9999) - (b.birth_year ?? b.death_year ?? 9999)
          break
        case 'connections':
          cmp = (degreeMap.get(b.id) ?? 0) - (degreeMap.get(a.id) ?? 0)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredSages, sortKey, sortDir, degreeMap])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const columns: Array<{ key: SortKey; labelHe: string; labelEn: string; labelRu: string; className?: string }> = [
    { key: 'period',      labelHe: 'תקופה',   labelEn: 'Era',         labelRu: 'Эпоха',   className: 'w-[120px]' },
    { key: 'label',       labelHe: 'שם',       labelEn: 'Name',        labelRu: 'Имя',     className: 'min-w-[160px]' },
    { key: 'location',    labelHe: 'מיקום',    labelEn: 'Location',    labelRu: 'Место',   className: 'w-[130px] hidden sm:table-cell' },
    { key: 'field',       labelHe: 'תחום',     labelEn: 'Field',       labelRu: 'Область', className: 'w-[130px] hidden md:table-cell' },
    { key: 'birth_year',  labelHe: 'שנים',     labelEn: 'Years',       labelRu: 'Годы',    className: 'w-[110px] hidden sm:table-cell' },
    { key: 'connections', labelHe: 'קשרים',    labelEn: 'Links',       labelRu: 'Связи',   className: 'w-[72px] text-center' },
  ]

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <span className="text-ink-700 ms-1">⇅</span>
    return <span className="text-gold-400 ms-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Stats bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-ink-700/40 bg-ink-900/60">
        <span className="text-xs font-sans text-ink-400">
          {isHe
            ? `${filteredSages.length.toLocaleString('he-IL')} מתוך ${sages.length.toLocaleString('he-IL')} חכמים`
            : `${filteredSages.length} of ${sages.length} sages`}
        </span>
        {filteredSages.length < sages.length && (
          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/25">
            {isHe ? 'מסונן' : 'filtered'}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm font-sans" dir={isHe ? 'rtl' : 'ltr'}>
          <thead className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur-sm">
            <tr className="border-b border-ink-700/50">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-3 py-2.5 text-start select-none cursor-pointer',
                    'text-[11px] font-semibold uppercase tracking-widest',
                    'text-ink-400 hover:text-ink-200 transition-colors',
                    'border-b border-ink-700/40',
                    col.className,
                  )}
                >
                  {isHe ? col.labelHe : locale === 'ru' ? col.labelRu : col.labelEn}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((sage, idx) => {
              const color  = ERA_COLORS[sage.period] ?? '#7a6550'
              const degree = degreeMap.get(sage.id) ?? 0
              const years  = formatYearRange(sage.birth_year, sage.death_year)
              const isHovered = hoveredId === sage.id

              return (
                <tr
                  key={sage.id}
                  onClick={() => selectSage(sage)}
                  onMouseEnter={() => setHoveredId(sage.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    'cursor-pointer border-b border-ink-800/60 transition-colors',
                    isHovered ? 'bg-ink-700/40' : idx % 2 === 0 ? 'bg-transparent' : 'bg-ink-900/30',
                  )}
                >
                  {/* Era chip */}
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      {ERA_LABELS[sage.period]?.[locale]}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2">
                    <p className="font-serif text-sm font-semibold text-ink-100 leading-snug">
                      {sage.label}
                    </p>
                    {sage.name_en && (
                      <p className="text-[11px] text-ink-500 mt-0.5 truncate max-w-[180px]">
                        {sage.name_en}
                      </p>
                    )}
                  </td>

                  {/* Location */}
                  <td className="px-3 py-2 hidden sm:table-cell">
                    {sage.location && (
                      <span className="text-xs text-ink-400 truncate block max-w-[120px]">
                        {sage.location}
                      </span>
                    )}
                  </td>

                  {/* Field */}
                  <td className="px-3 py-2 hidden md:table-cell">
                    {sage.field && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: `${color}12`, color }}
                      >
                        {sage.field}
                      </span>
                    )}
                  </td>

                  {/* Years */}
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <span className="text-[11px] text-ink-500 tabular-nums">
                      {years ?? '—'}
                    </span>
                  </td>

                  {/* Connection count */}
                  <td className="px-3 py-2 text-center">
                    {degree > 0 && (
                      <span
                        className="inline-block text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${color}18`, color }}
                      >
                        {degree}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-600 font-sans">
                  {isHe ? 'אין חכמים התואמים לפילטר הנוכחי' : 'No sages match current filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

## FILE: components/viz/Timeline.tsx

_(557 lines)_

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import type { Locale, Period, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'

import { ALL_PERIODS } from '@/lib/types'
import { tr } from '@/lib/i18n'

const ERAS: Period[] = ALL_PERIODS

const ERA_YEARS: Record<Period, [number, number]> = {
  patriarchs:      [-1850,-1500],
  exodus:          [-1500,-1200],
  judges:          [-1200,-1020],
  kings:           [-1020,-586],
  'second-temple': [-516,  70],
  tannaim:         [  10, 220],
  amoraim:         [ 220, 500],
  geonim:          [ 589,1038],
  rishonim:        [1038,1500],
  acharonim:       [1500,1900],
  modern:          [1880,2024],
}

const MIN_YEAR = -1900
const MAX_YEAR =  2024
const YEAR_SPAN = MAX_YEAR - MIN_YEAR

const SVG_W    = 9000   // wide scrollable canvas
const BAND_H   = 110    // px per era band
const LABEL_W  = 110    // reserved for era label on left
const DOT_R    = 5
const ROWS     = 4      // stagger rows within band to avoid overlap
const COL_W    = 90     // bucket width for stagger

// Historical milestones — shared module (lib/milestones.ts), Masterplan §8
import { MILESTONES } from '@/lib/milestones'
import type { Milestone } from '@/lib/milestones'

interface TimelineProps {
  locale: Locale
}

function sageYear(sage: Sage): number {
  if (sage.birth_year) return sage.birth_year
  if (sage.death_year) return sage.death_year - 60
  const [s, e] = ERA_YEARS[sage.period] ?? [1000, 1500]
  // deterministic jitter from id
  let h = 0
  for (const c of String(sage.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return s + (h % 1000) / 1000 * (e - s)
}

function yearToX(year: number): number {
  return LABEL_W + ((year - MIN_YEAR) / YEAR_SPAN) * (SVG_W - LABEL_W)
}

export function Timeline({ locale }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const svgElRef     = useRef<SVGSVGElement | null>(null)
  const zoomRef      = useRef<import('d3').ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [viewport, setViewport] = useState({ start: 0, width: 0.1 }) // minimap indicator (0..1)
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null)

  const { sages, filteredSages, selectedSageId, selectSage, connections } = useAppStore()

  // Extra 90px: 4-row staggered event labels (4×13px) + year axis (28px) + padding
  const SVG_H = BAND_H * ERAS.length + 90

  useEffect(() => {
    if (!sages.length || !containerRef.current) return
    let mounted = true

    async function build() {
      const d3 = await import('d3')
      if (!mounted || !containerRef.current) return

      const container = containerRef.current
      d3.select(container).selectAll('svg').remove()

      const svg = d3.select(container)
        .append('svg')
        .attr('width', SVG_W)
        .attr('height', SVG_H)

      svgElRef.current = svg.node()

      // Zoom (horizontal only)
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 8])
        .on('zoom', ev => {
          const t = ev.transform
          // restrict to horizontal pan only; keep y fixed
          g.attr('transform', `translate(${t.x},0) scale(${t.k},1)`)
        })
      svg.call(zoom)
      zoomRef.current = zoom

      const g = svg.append('g')

      // ── Era bands ──────────────────────────────────────────
      ERAS.forEach((era, eraIdx) => {
        const y    = eraIdx * BAND_H
        const color = ERA_COLORS[era] ?? '#7a6550'

        // Band background (alternating subtle shade)
        g.append('rect')
          .attr('x', 0).attr('y', y)
          .attr('width', SVG_W).attr('height', BAND_H)
          .attr('fill', eraIdx % 2 === 0 ? 'rgba(26,20,12,0.4)' : 'rgba(18,14,8,0.4)')

        // Era year range highlight
        const [start, end] = ERA_YEARS[era]
        const rx = yearToX(start)
        const rw = yearToX(end) - rx
        g.append('rect')
          .attr('x', rx).attr('y', y + 2)
          .attr('width', Math.max(0, rw)).attr('height', BAND_H - 4)
          .attr('fill', color)
          .attr('opacity', 0.05)
          .attr('rx', 4)

        // Band separator line
        g.append('line')
          .attr('x1', 0).attr('x2', SVG_W)
          .attr('y1', y + BAND_H).attr('y2', y + BAND_H)
          .attr('stroke', 'rgba(58,50,38,0.4)')
          .attr('stroke-width', 1)

        // Era label (fixed left)
        g.append('rect')
          .attr('x', 0).attr('y', y)
          .attr('width', LABEL_W).attr('height', BAND_H)
          .attr('fill', `${color}12`)

        g.append('text')
          .attr('x', LABEL_W / 2).attr('y', y + BAND_H / 2 + 1)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', 11)
          .attr('font-weight', '600')
          .attr('fill', color)
          .attr('pointer-events', 'none')
          .text(ERA_LABELS[era]?.[locale] ?? era)
      })

      // ── Historical milestone bars (Masterplan §8) ──────────
      // Background layer; always visible (independent of sage filters);
      // clickable → impact summary card.
      const totalH  = BAND_H * ERAS.length
      const eventsG = g.append('g').attr('class', 'event-bars')

      MILESTONES.forEach((ev, idx) => {
        const x = yearToX(ev.year)
        if (x < LABEL_W) return

        // stagger labels in 4 rows so they don't overlap each other
        const row    = idx % 4
        const labelY = totalH + 8 + row * 13

        // Prominent full-height dashed line — the event is a visual marker
        // on the timeline itself, not just a caption below it
        eventsG.append('rect')
          .attr('x', x - 3).attr('y', 0)
          .attr('width', 6).attr('height', totalH)
          .attr('rx', 3)
          .attr('fill', '#e53935')
          .attr('opacity', 0.10)
          .attr('pointer-events', 'none')

        eventsG.append('line')
          .attr('x1', x).attr('y1', 0)
          .attr('x2', x).attr('y2', labelY - 2)
          .attr('stroke', '#e53935')
          .attr('stroke-width', 1.8)
          .attr('stroke-dasharray', '7 5')
          .attr('opacity', 0.65)
          .attr('pointer-events', 'none')

        // Diamond marker at the top of the line
        eventsG.append('path')
          .attr('d', `M ${x} 2 l 5 6 l -5 6 l -5 -6 Z`)
          .attr('fill', '#e53935')
          .attr('opacity', 0.85)
          .attr('stroke', '#0a0806')
          .attr('stroke-width', 1)
          .attr('pointer-events', 'none')

        eventsG.append('text')
          .attr('x', x).attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'hanging')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', 9)
          .attr('font-weight', '700')
          .attr('fill', '#c62828')
          .attr('stroke', '#0a0806')
          .attr('stroke-width', 2.5)
          .attr('paint-order', 'stroke')
          .attr('pointer-events', 'none')
          .text(`${ev.label[locale]} · ${Math.abs(ev.year)}${ev.year < 0 ? tr(locale, ' לפנה"ס', ' BCE', ' до н.э.') : ''}`)

        // Invisible wide hit area — the whole vertical bar is clickable
        eventsG.append('rect')
          .attr('x', x - 7).attr('y', 0)
          .attr('width', 14).attr('height', totalH + 8 + 4 * 13)
          .attr('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', () => setActiveMilestone(ev))
      })

      // ── Year axis ticks ────────────────────────────────────
      const axisY = SVG_H - 28
      g.append('line')
        .attr('x1', LABEL_W).attr('x2', SVG_W)
        .attr('y1', axisY).attr('y2', axisY)
        .attr('stroke', 'rgba(122,101,80,0.3)')
        .attr('stroke-width', 1)

      for (let yr = -1800; yr <= 2000; yr += 200) {
        const x = yearToX(yr)
        g.append('line')
          .attr('x1', x).attr('x2', x)
          .attr('y1', axisY - 4).attr('y2', axisY + 4)
          .attr('stroke', 'rgba(122,101,80,0.4)')
          .attr('stroke-width', 1)
        g.append('text')
          .attr('x', x).attr('y', axisY + 14)
          .attr('text-anchor', 'middle')
          .attr('font-family', 'Heebo, sans-serif')
          .attr('font-size', 9)
          .attr('fill', '#5a4a38')
          .text(yr < 0 ? `${Math.abs(yr)} לפנה"ס` : `${yr}`)
      }

      // ── Place sage dots ────────────────────────────────────
      // For each era, bucket sages into column slots and stagger rows
      const colBuckets = new Map<string, number>() // `${eraIdx}-${col}` → next row

      const filteredIds = new Set(filteredSages.map(s => s.id))

      // Notable sages (highest connection degree) get always-visible labels —
      // fixes the "empty view" feel (masterplan §4: data density)
      const degree = new Map<string, number>()
      connections.forEach(c => {
        degree.set(c.source, (degree.get(c.source) ?? 0) + 1)
        degree.set(c.target, (degree.get(c.target) ?? 0) + 1)
      })
      const notableIds = new Set(
        [...sages]
          .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0))
          .slice(0, 48)
          .map(s => s.id),
      )

      const dotData = sages.map(sage => {
        const eraIdx = ERAS.indexOf(sage.period)
        if (eraIdx < 0) return null
        const year   = sageYear(sage)
        const x      = yearToX(year)
        const col    = Math.floor((x - LABEL_W) / COL_W)
        const key    = `${eraIdx}-${col}`
        const row    = (colBuckets.get(key) ?? 0) % ROWS
        colBuckets.set(key, row + 1)
        const baseY  = eraIdx * BAND_H
        const cy     = baseY + 15 + row * ((BAND_H - 30) / ROWS)
        return { sage, x, cy, eraIdx, row }
      }).filter(Boolean) as Array<{ sage: Sage; x: number; cy: number; eraIdx: number; row: number }>

      const dotsG = g.append('g').attr('class', 'dots')
      const dots  = dotsG.selectAll<SVGCircleElement, typeof dotData[0]>('circle')
        .data(dotData)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.cy)
        .attr('r',  DOT_R)
        .attr('fill',         d => ERA_COLORS[d.sage.period] ?? '#7a6550')
        .attr('stroke',       d => d.sage.id === selectedSageId ? '#c9973a' : '#0a0806')
        .attr('stroke-width', d => d.sage.id === selectedSageId ? 2.5 : 1)
        .attr('fill-opacity', d => filteredIds.has(d.sage.id) ? 0.85 : 0.1)
        .style('cursor', 'pointer')

      // Labels (hidden until hover)
      const labelsG = g.append('g').attr('class', 'dot-labels').attr('pointer-events', 'none')

      // Always-visible labels + years for notable sages
      const staticLabelsG = g.append('g').attr('class', 'static-labels').attr('pointer-events', 'none')
      dotData
        .filter(d => notableIds.has(d.sage.id))
        .forEach(d => {
          const years = [d.sage.birth_year, d.sage.death_year].filter(Boolean).join('–')
          const yBase = d.cy - DOT_R - 4
          const bandY = d.eraIdx * BAND_H
          const flip  = yBase < bandY + 16
          staticLabelsG.append('text')
            .attr('x', d.x)
            .attr('y', flip ? d.cy + DOT_R + 4 : yBase)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', flip ? 'hanging' : 'auto')
            .attr('font-family', 'Heebo, sans-serif')
            .attr('font-size', 9.5)
            .attr('font-weight', '600')
            .attr('fill', 'var(--ink-200)')
            .attr('stroke', 'var(--ink-900)')
            .attr('stroke-width', 2.5)
            .attr('paint-order', 'stroke')
            .text(years ? `${d.sage.label} · ${years}` : d.sage.label)
        })

      dots
        .on('mouseover', (ev, d) => {
          d3.select(ev.currentTarget)
            .attr('r', DOT_R + 3)
            .attr('fill-opacity', 1)

          const lbl = labelsG.append('text')
            .attr('id', `lbl-${d.sage.id}`)
            .attr('x', d.x)
            .attr('y', d.cy - DOT_R - 4)
            .attr('text-anchor', 'middle')
            .attr('font-family', 'Heebo, sans-serif')
            .attr('font-size', 10)
            .attr('fill', '#e8d5b0')
            .attr('stroke', '#0a0806')
            .attr('stroke-width', 2.5)
            .attr('paint-order', 'stroke')
            .text(d.sage.label)

          // Keep label within band
          const bandY = d.eraIdx * BAND_H
          const lblY  = d.cy - DOT_R - 4
          if (lblY < bandY + 8) {
            lbl.attr('y', d.cy + DOT_R + 12).attr('dominant-baseline', 'hanging')
          }
        })
        .on('mouseout', (ev, d) => {
          d3.select(ev.currentTarget)
            .attr('r', DOT_R)
            .attr('fill-opacity', filteredIds.has(d.sage.id) ? 0.85 : 0.1)
          labelsG.select(`#lbl-${d.sage.id}`).remove()
        })
        .on('click', (_ev, d) => {
          selectSage(d.sage)
        })
    }

    build()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

  // Auto-scroll to the densest region on first render — fixes the
  // "empty view" issue (previously opened on sparse ancient centuries)
  useEffect(() => {
    if (!sages.length || !scrollRef.current) return
    const el = scrollRef.current
    const years = sages.map(sageYear).sort((a, b) => a - b)
    const median = years[Math.floor(years.length / 2)] ?? 1200
    const t = setTimeout(() => {
      el.scrollLeft = Math.max(0, yearToX(median) - el.clientWidth / 2)
    }, 60)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sages.length])

  // Escape dismisses the milestone card
  useEffect(() => {
    if (!activeMilestone) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveMilestone(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeMilestone])

  // Track scroll → minimap viewport indicator
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setViewport({
      start: el.scrollLeft / SVG_W,
      width: el.clientWidth / SVG_W,
    })
  }

  // Minimap click → jump scroll
  const jumpTo = (ratio: number) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ left: ratio * SVG_W - el.clientWidth / 2, behavior: 'smooth' })
  }

  // Sync filter dim
  useEffect(() => {
    if (!svgElRef.current) return
    import('d3').then(d3 => {
      const ids      = new Set(filteredSages.map(s => s.id))
      const noFilter = ids.size === sages.length
      d3.select(svgElRef.current).selectAll<SVGCircleElement, any>('.dots circle')
        .transition().duration(250)
        .attr('fill-opacity', d => noFilter || ids.has(d.sage.id) ? 0.85 : 0.1)
    })
  }, [filteredSages, sages.length])

  // Sync selection ring + scroll the selected sage into view
  useEffect(() => {
    if (!svgElRef.current) return
    import('d3').then(d3 => {
      d3.select(svgElRef.current).selectAll<SVGCircleElement, any>('.dots circle')
        .attr('stroke',       d => d.sage.id === selectedSageId ? '#c9973a' : '#0a0806')
        .attr('stroke-width', d => d.sage.id === selectedSageId ? 2.5 : 1)
    })
    if (selectedSageId && scrollRef.current) {
      const sage = sages.find(s => s.id === selectedSageId)
      if (sage) {
        const el = scrollRef.current
        el.scrollTo({
          left: Math.max(0, yearToX(sageYear(sage)) - el.clientWidth / 2),
          behavior: 'smooth',
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSageId])

  const zoomBy = (k: number) => {
    if (!svgElRef.current || !zoomRef.current) return
    import('d3').then(d3 => {
      d3.select(svgElRef.current!).transition().duration(300).call(zoomRef.current!.scaleBy, k)
    })
  }

  return (
    <div
      ref={scrollRef}
      dir="ltr"
      onScroll={onScroll}
      className="relative w-full h-full overflow-auto"
    >
      {/* Horizontally scrollable SVG container */}
      <div
        ref={containerRef}
        className="min-w-full"
        style={{ height: SVG_H }}
      />

      {!sages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-ink-500 font-sans text-sm animate-pulse">
            {tr(locale, 'טוען ציר זמן...', 'Loading timeline...', 'Загрузка хронологии...')}
          </p>
        </div>
      )}

      {/* Milestone impact summary card (Masterplan §8: click → summary) */}
      {activeMilestone && (
        <div
          dir={locale === 'he' ? 'rtl' : 'ltr'}
          className="fixed bottom-[120px] left-1/2 -translate-x-1/2 z-30 glass rounded-xl border border-red-500/25 px-4 py-3 shadow-glass-lg animate-fade-in"
          style={{ width: 'min(440px, calc(100vw - 32px))' }}
          role="dialog"
          aria-label={activeMilestone.label[locale]}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-sm font-bold text-red-300">
              {activeMilestone.label[locale]}
              <span className="font-mono text-xs text-ink-400 font-normal">
                {' · '}{Math.abs(activeMilestone.year)}{activeMilestone.year < 0 ? tr(locale, ' לפנה"ס', ' BCE', ' до н.э.') : ''}
              </span>
            </p>
            <button
              onClick={() => setActiveMilestone(null)}
              className="text-ink-500 hover:text-ink-100 transition-colors flex-shrink-0 -mt-0.5"
              aria-label={tr(locale, 'סגור', 'Close', 'Закрыть')}
            >
              ✕
            </button>
          </div>
          <p className="font-sans text-xs text-ink-200 leading-relaxed mt-1.5">
            {activeMilestone.summary[locale]}
          </p>
        </div>
      )}

      {/* Minimap navigator — click to jump across centuries */}
      <div
        dir="ltr"
        className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-20 glass rounded-lg px-1.5 py-1.5 hidden sm:block"
        style={{ width: 'min(480px, calc(100vw - 140px))' }}
        role="slider"
        aria-label={tr(locale, 'ניווט מהיר בציר הזמן', 'Timeline quick navigation', 'Быстрая навигация по хронологии')}
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={Math.round(MIN_YEAR + (viewport.start + viewport.width / 2) * YEAR_SPAN)}
        tabIndex={0}
        onClick={e => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
          jumpTo((e.clientX - r.left) / r.width)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') jumpTo(viewport.start + viewport.width * 1.5)
          if (e.key === 'ArrowLeft')  jumpTo(Math.max(0, viewport.start - viewport.width * 0.5))
        }}
      >
        <div className="relative h-4 rounded overflow-hidden cursor-pointer">
          {/* Era segments */}
          {ERAS.map(era => {
            const [s, e] = ERA_YEARS[era]
            const left  = ((yearToX(s) / SVG_W) * 100)
            const width = (((yearToX(e) - yearToX(s)) / SVG_W) * 100)
            return (
              <div
                key={era}
                className="absolute top-0 bottom-0"
                title={ERA_LABELS[era]?.[locale]}
                style={{ left: `${left}%`, width: `${width}%`, background: ERA_COLORS[era], opacity: 0.45 }}
              />
            )
          })}
          {/* Viewport indicator */}
          <div
            className="absolute top-0 bottom-0 rounded-sm pointer-events-none transition-all duration-150"
            style={{
              left:  `${viewport.start * 100}%`,
              width: `${Math.max(2, viewport.width * 100)}%`,
              border: '1.5px solid var(--gold-500, #c9973a)',
              background: 'rgba(201,151,58,0.18)',
            }}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="fixed bottom-20 end-4 z-10 flex flex-col gap-1.5">
        <ZBtn onClick={() => zoomBy(1.5)}>+</ZBtn>
        <ZBtn onClick={() => zoomBy(0.67)}>−</ZBtn>
      </div>
    </div>
  )
}

function ZBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn(
      'w-11 h-11 md:w-8 md:h-8 rounded-lg text-sm font-mono',
      'glass border border-ink-600/40',
      'text-ink-300 hover:text-gold-300 hover:border-gold-500/30',
      'transition-all flex items-center justify-center',
    )}>
      {children}
    </button>
  )
}
```

## FILE: components/viz/Traditions.tsx

_(164 lines)_

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ERA_COLORS, ERA_LABELS, ALL_PERIODS } from '@/lib/types'
import { useAppStore } from '@/store/useAppStore'
import { formatYearRange } from '@/lib/utils'
import type { Locale, Period, Sage } from '@/lib/types'
import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'

const ERAS: Period[] = ALL_PERIODS

interface TraditionsProps {
  locale: Locale
}

export function Traditions({ locale }: TraditionsProps) {
  const { filteredSages, selectSage } = useAppStore()
  const [expanded, setExpanded] = useState<Set<Period>>(new Set(ERAS))

  const toggle = (era: Period) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(era) ? next.delete(era) : next.add(era)
      return next
    })

  // Group sages by period
  const byEra = new Map<Period, typeof filteredSages>()
  ERAS.forEach(e => byEra.set(e, []))
  filteredSages.forEach(sage => {
    const bucket = byEra.get(sage.period)
    if (bucket) bucket.push(sage)
  })

  return (
    <div className="h-full overflow-y-auto px-4 md:px-8 py-6 space-y-4">
      {ERAS.map(era => {
        const color   = ERA_COLORS[era] ?? '#7a6550'
        const label   = ERA_LABELS[era]?.[locale] ?? era
        const sages   = byEra.get(era) ?? []
        const isOpen  = expanded.has(era)

        return (
          <section
            key={era}
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: `${color}28` }}
          >
            {/* Era header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4 transition-colors"
              style={{ background: `${color}12` }}
              onClick={() => toggle(era)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <h2 className="font-serif text-lg font-bold" style={{ color }}>
                  {label}
                </h2>
                <span
                  className="text-xs font-sans px-2 py-0.5 rounded-full"
                  style={{ background: `${color}22`, color }}
                >
                  {sages.length.toLocaleString('he-IL')}
                </span>
              </div>
              <svg
                className="w-4 h-4 transition-transform duration-200"
                style={{ color, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Sage grid */}
            {isOpen && (
              <div
                className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
                style={{ background: 'rgba(15,12,8,0.6)' }}
              >
                {sages.length === 0 ? (
                  <p className="col-span-full text-center text-sm text-ink-600 py-4 font-sans">
                    {tr(locale, 'אין חכמים בפילטר הנוכחי', 'No sages match current filters', 'Нет мудрецов по текущим фильтрам')}
                  </p>
                ) : (
                  sages.map(sage => (
                    <SageCard
                      key={sage.id}
                      sage={sage}
                      locale={locale}
                      accentColor={color}
                      onSelect={() => selectSage(sage)}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

function SageCard({
  sage, locale, accentColor, onSelect,
}: {
  sage: Sage
  locale: Locale
  accentColor: string
  onSelect: () => void
}) {
  const yearRange = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <div
      className="group rounded-xl p-3 border border-ink-700/40 hover:border-ink-600/60 bg-ink-800/30 hover:bg-ink-700/40 transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-serif text-sm font-semibold text-ink-100 group-hover:text-gold-300 transition-colors leading-snug">
          {sage.label}
        </p>
        <Link
          href={`/${locale}/sage/${sage.id}`}
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 text-ink-600 hover:text-gold-400 transition-colors p-0.5 rounded"
          title={tr(locale, 'דף מלא', 'Full page', 'Полная страница')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </Link>
      </div>

      {sage.name_en && (
        <p className="text-[11px] font-sans text-ink-500 mb-1.5 truncate">{sage.name_en}</p>
      )}

      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {yearRange && (
          <span className="text-[10px] font-sans text-ink-500">{yearRange}</span>
        )}
        {sage.field && (
          <span
            className="text-[10px] font-sans px-1.5 py-0.5 rounded"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {sage.field}
          </span>
        )}
      </div>
    </div>
  )
}
```

