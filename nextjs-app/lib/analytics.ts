// Demand measurement: what the site is used for, so a decision about an app, a paid assistant or a
// new feature rests on numbers. Cookie-free (Vercel Web Analytics), no account, no personal data: an
// event carries a name and a few coarse properties, never a question, a name or an id of a person.
//
// Page views, devices, countries, referrers and UTM tags (the installed app opens with
// utm_source=pwa) come from <Analytics /> itself. Custom events below need a Vercel plan that records
// them (Pro); on a plan that does not, track() is harmless and records nothing.
import { track as vercelTrack } from '@vercel/analytics'

/** The events the site sends. Keep this list short and the names stable: a chart is built on a name. */
export type AnalyticsEvent =
  | 'video_play'          // the visitor loaded a sage's YouTube video   { locale }
  | 'listen_load'         // ... or the Spotify player                    { locale }
  | 'chat_open'           // the assistant panel was opened               { locale }
  | 'chat_question'       // a question was sent                          { locale, mode: model|referral }
  | 'tab_view'            // a visualization tab was opened               { tab }
  | 'research_listen'     // the research was read aloud (first press)   { locale, lang }
  | 'today_share'         // the Today page was shared                   { locale, method: image|download|whatsapp|video|video_download }
  | 'tower_share'         // a sage or a path in the Tower of Generations was shared { locale, method: share|copy|image|download }
  | 'riddle_start'        // the first guess of the day in the sage riddle   { locale }
  | 'riddle_complete'     // ... and the game was won or lost              { locale, won, tries: 1..6 }
  | 'riddle_share'        // the riddle's result was shared                { locale, method: share|copy|whatsapp }
  | 'tower_road'          // the road to Sinai was flown in the tower      { locale, from: panel|link }
  | 'connect_path'        // the picker found a path between two sages     { locale, steps }
  | 'connect_fly'         // a path was flown in the tower                 { locale, from: picker|game|link }
  | 'chain_start'         // the first move of the day in the sage chain   { locale }
  | 'chain_complete'      // ... and the game was won or lost              { locale, won, steps, best }
  | 'chain_share'         // the chain's result was shared                 { locale, method: share|copy|whatsapp }
  | 'quiz_start'          // a quiz was started                           { locale, kind: sage|kids }
  | 'quiz_complete'       // ... and finished                             { locale, kind, score: 0..100, stars: 0..3 }
  | 'kids_station_done'   // a child stamped a station of the kids' journey { route: saltiel|shira }
  | 'kids_tour'           // the kids' journey flown in the tower (time machine) { route, stage: start|end }
  | 'music_toggle'        // the background music was turned on or off   { locale, state: on|off }
  | 'return_visit'        // the browser came back on another day        { visits: '2'..'10+' }
  | 'pwa_prompt_available' // the browser offered installation          {}
  | 'pwa_install_click'   // the visitor pressed "install as an app"      { platform }
  | 'pwa_install_choice'  // ... and answered the browser's prompt        { outcome: accepted|dismissed }
  | 'pwa_installed'       // the app was installed                        {}
  | 'pwa_open'            // the installed app was opened                 {}

type Props = Record<string, string | number | boolean | null>

/** Send one event. Never throws, never runs outside production, never blocks the interface. */
export function track(name: AnalyticsEvent, props?: Props): void {
  if (process.env.NODE_ENV !== 'production') return
  try {
    vercelTrack(name, props)
  } catch {
    // measurement must not break the page
  }
}
