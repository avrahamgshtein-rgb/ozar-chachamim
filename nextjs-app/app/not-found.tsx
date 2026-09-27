import { NotFoundView } from '@/components/layout/NotFoundView'
import { fontVariables, THEME_INIT_SCRIPT } from './fonts'

// Last-resort 404 for paths outside any locale that the middleware lets
// through (anything with a dot, such as /wp-login.php). The root layout is a
// pass-through, so this renders its own document, in Hebrew, the default.
export default function RootNotFound() {
  return (
    <html lang="he" dir="rtl" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans bg-ink-900 text-ink-100 antialiased">
        <NotFoundView />
      </body>
    </html>
  )
}
