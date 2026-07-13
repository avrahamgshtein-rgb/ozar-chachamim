'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Global Error]', error.message)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#111827',
        color: '#e5e7eb'
      }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '1rem',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="#f87171">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0 1rem', color: '#f3f4f6' }}>
              Critical Error
            </h1>

            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              The application encountered a critical error and cannot continue. Please refresh the page or contact support.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}>
                  Error details (dev only)
                </summary>
                <pre style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: '#111827',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  maxHeight: '128px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {error.message}
                </pre>
              </details>
            )}

            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'background 200ms'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
            >
              Try again
            </button>

            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
              Error ID: {error.digest}
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
