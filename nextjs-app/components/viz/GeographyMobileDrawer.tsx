'use client'

import { cn } from '@/lib/utils'
import { tr } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { GeographyPanel } from './GeographyPanel'

interface GeographyMobileDrawerProps {
  locale: Locale
  isOpen: boolean
  onClose: () => void
}

export function GeographyMobileDrawer({ locale, isOpen, onClose }: GeographyMobileDrawerProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'bg-ink-950 border-t border-ink-800',
          'max-h-[80vh] rounded-t-lg shadow-xl',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-ink-700 rounded-full" />
        </div>

        {/* Close button */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-ink-800">
          <h3 className="text-sm font-sans font-bold text-gold-300">
            {tr(locale, 'גיאוגרפיה', 'Geography', 'География')}
          </h3>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-200 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Panel content */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          <GeographyPanel locale={locale} isMobile onClose={onClose} />
        </div>
      </div>
    </>
  )
}
