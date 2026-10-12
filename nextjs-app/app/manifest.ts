import type { MetadataRoute } from 'next'

// The web app manifest: what makes "install" appear in Chrome, Edge and Samsung Internet and what the
// Home Screen shortcut looks like on iOS. Served at /manifest.webmanifest. It is the one place that is
// Hebrew only: a manifest has a single name, and Hebrew is the site's canonical language.
// The installed app opens with utm_source=pwa so Web Analytics can tell its visits from the browser's.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'אוצר חכמים — גרף הידע של חכמי ישראל',
    short_name: 'אוצר חכמים',
    description: 'מפת הקשרים של חכמי ישראל לדורותיהם: גרף, מפה, ציר זמן, מחקרים ופרקי האזנה.',
    start_url: '/?utm_source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0806',
    theme_color: '#0a0806',
    lang: 'he',
    dir: 'rtl',
    categories: ['education', 'books', 'reference'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
