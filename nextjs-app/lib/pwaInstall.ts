// "Install as an app": the browser's install prompt, kept so that any button on the site can use it.
// Chrome, Edge and Samsung Internet fire `beforeinstallprompt` once, early, so the listener is registered
// as soon as this module loads (PwaRegister imports it from the layout). Safari on iOS has no prompt: the
// visitor adds the site to the Home Screen by hand, and push notifications only work from there.
import { useSyncExternalStore } from 'react'
import { track } from './analytics'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

/** The installed app (any browser) runs without the browser's chrome. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    track('pwa_prompt_available')
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    track('pwa_installed')
    emit()
  })
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export type InstallState = 'none' | 'prompt' | 'ios'

/** What the visitor can do right now: nothing (installed, or not installable), press install, or follow the iOS steps. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(
    subscribe,
    () => (isStandalone() ? 'none' : deferred ? 'prompt' : isIos() ? 'ios' : 'none'),
    () => 'none',
  )
}

/** Ask the browser to install the app. Returns the visitor's answer, or null when there is no prompt. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  const ev = deferred
  if (!ev) return null
  track('pwa_install_click', { platform: 'prompt' })
  await ev.prompt()
  const { outcome } = await ev.userChoice
  track('pwa_install_choice', { outcome })
  deferred = null          // the event can be used once
  emit()
  return outcome
}
