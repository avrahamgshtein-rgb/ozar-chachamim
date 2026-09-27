import { Frank_Ruhl_Libre, Heebo } from 'next/font/google'

// Shared by every document shell: the locale layout and the root 404 each
// render their own <html>, so the font variables are defined once here.
const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-frank-ruhl',
  display: 'swap',
})

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-heebo',
  display: 'swap',
})

export const fontVariables = `${frankRuhlLibre.variable} ${heebo.variable}`

// Runs synchronously in <head>, before first paint, so a reader who chose the
// light theme never sees a dark frame. It must be a plain inline <script>:
// next/script's beforeInteractive only queues inline code for the client
// runtime in the app router, and that runs after the page has painted.
export const THEME_INIT_SCRIPT =
  "try{if(localStorage.getItem('ozar-theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}"
