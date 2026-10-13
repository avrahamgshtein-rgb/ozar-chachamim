'use client'

// The quiz of a station on the kids' journey: ten questions from the book, played by the shared quiz
// player. A star or more stamps the station in the passport, as "finished the station" does.
import { KIDS_QUIZ_LENGTH, kidsQuizUrl } from '@/lib/quiz'
import { KIDS_QUIZ_STORE } from '@/lib/quizProgress'
import { track } from '@/lib/analytics'
import type { RouteKey } from '@/lib/kidsJourney'
import { isStationDone, toggleStation } from '@/lib/kidsJourneyProgress'
import { QuizPlayer } from '@/components/quiz/QuizPlayer'

const VERDICTS = [
  'כמעט! קראו שוב את כרטיס המסע ונסו עוד פעם.',
  'יפה! קיבלתם כוכב, והתחנה נחתמה בדרכון.',
  'מצוין! שני כוכבים, והתחנה בדרכון.',
  'וואו! שלושה כוכבים. אתם כבר מכירים את התחנה הזאת מקרוב.',
]

export function StationQuiz({ route, n }: { route: RouteKey; n: number }) {
  return (
    <QuizPlayer
      anchor={`quiz-${route}-${n}`}
      kind="kids"
      src={kidsQuizUrl(route, n)}
      progressKey={`${route}-${n}`}
      store={KIDS_QUIZ_STORE}
      title="חידון התחנה"
      subtitle="10 שאלות · 100 נקודות · כוכב אחד מחתים את הדרכון"
      locale="he"
      length={KIDS_QUIZ_LENGTH}
      headingLevel="h3"
      verdicts={VERDICTS}
      onComplete={(_score, stars) => {
        if (stars >= 1 && !isStationDone(route, n) && toggleStation(route, n)) track('kids_station_done', { route })
      }}
    />
  )
}
