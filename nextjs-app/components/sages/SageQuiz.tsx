'use client'

// "Get to know the sage": the quiz on the sage page. Twenty questions from his research paper, played by
// the shared quiz player; the best result per sage is the journey passport.
import type { Locale } from '@/lib/types'
import { QUIZ_LENGTH, quizUrl } from '@/lib/quiz'
import { QuizPlayer } from '@/components/quiz/QuizPlayer'

const S = {
  title: { he: 'חידון: הכירו את החכם', en: 'Quiz: get to know the sage', ru: 'Викторина: познакомьтесь с мудрецом' },
  sub: {
    he: '20 שאלות · 100 נקודות · מתוך המחקר על {name}',
    en: '20 questions · 100 points · from the research on {name}',
    ru: '20 вопросов · 100 очков · по исследованию о {name}',
  },
  readResearch: { he: 'לקריאת המחקר', en: 'Read the research', ru: 'Читать исследование' },
} satisfies Record<string, Record<Locale, string>>

interface Props {
  sageId: string
  name: string
  locale: Locale
  /** Whether the page has the research section to send the reader to. */
  hasResearch: boolean
}

export function SageQuiz({ sageId, name, locale, hasResearch }: Props) {
  return (
    <QuizPlayer
      anchor="quiz"
      kind="sage"
      src={quizUrl(sageId, locale)}
      progressKey={sageId}
      title={S.title[locale]}
      subtitle={S.sub[locale].replace('{name}', name)}
      locale={locale}
      length={QUIZ_LENGTH}
      showPassport
      footerLink={hasResearch ? { href: '#research', label: S.readResearch[locale] } : undefined}
    />
  )
}
