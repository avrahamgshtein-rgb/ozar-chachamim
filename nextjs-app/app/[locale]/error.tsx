'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'
import { tr } from '@/lib/i18n'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  params?: { locale: string }
}

export default function Error({ error, reset, params }: ErrorProps) {
  const locale = (params?.locale ?? 'he') as Locale
  const isHe = locale === 'he'

  useEffect(() => {
    // Log to error tracking service (e.g., Sentry)
    console.error('[Error Boundary]', error.message, error.stack)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureException(error, {
        contexts: {
          page: { locale, timestamp: new Date().toISOString() }
        }
      })
    }
  }, [error, locale])

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center',
      'bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900',
      'px-4 py-8'
    )}>
      <div className={cn(
        'max-w-md w-full glass rounded-2xl',
        'border border-ink-700/50 p-8',
        'text-center'
      )}>
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className={cn(
            'w-16 h-16 rounded-full',
            'bg-red-500/10 border border-red-500/30',
            'flex items-center justify-center'
          )}>
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-10a9 9 0 00-9 9m18 0a9 9 0 01-18 0m0 0a9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-ink-100 mb-2">
          {isHe ? 'משהו השתבש' : 'Something went wrong'}
        </h1>

        {/* Error Description */}
        <p className="text-sm text-ink-400 mb-6 leading-relaxed">
          {isHe
            ? 'התרחשה שגיאה בעת טעינת הדף. אנא נסה שוב או חזור לעמוד הבית.'
            : 'An error occurred while loading this page. Please try again or return to the home page.'}
        </p>

        {/* Error Details (Dev Only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-xs text-ink-500 hover:text-ink-400 transition-colors">
              {isHe ? 'פרטי שגיאה (dev only)' : 'Error details (dev only)'}
            </summary>
            <pre className="mt-2 p-3 bg-ink-900/50 rounded text-xs text-red-400 overflow-auto max-h-32 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className={cn(
          'flex flex-col gap-3',
          isHe ? 'flex-row-reverse' : ''
        )}>
          <button
            onClick={() => reset()}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium',
              'bg-blue-600 hover:bg-blue-700',
              'text-white transition-colors',
              'text-sm'
            )}
          >
            {isHe ? 'נסה שוב' : 'Try again'}
          </button>
          <Link
            href={`/${locale}`}
            className={cn(
              'flex-1 px-4 py-2 rounded-lg font-medium',
              'bg-ink-700 hover:bg-ink-600',
              'text-ink-100 transition-colors',
              'text-sm text-center'
            )}
          >
            {isHe ? 'חזור לעמוד הבית' : 'Go home'}
          </Link>
        </div>

        {/* Support Info */}
        <p className="mt-6 text-xs text-ink-500">
          {isHe
            ? 'אם בעיה זו חוזרת, אנא צור קשר עם התמיכה'
            : 'If this issue persists, please contact support'}
        </p>
      </div>
    </div>
  )
}
