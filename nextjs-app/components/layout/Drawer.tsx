'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/types'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  locale: Locale
  children: React.ReactNode
  title?: string
  width?: string
}

export function Drawer({
  isOpen,
  onClose,
  locale,
  children,
  width = 'var(--drawer-w, 420px)',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Trap focus when open
  useEffect(() => {
    if (isOpen) {
      drawerRef.current?.focus()
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-opacity duration-300',
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(7, 5, 3, 0.55)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel — side on desktop, sheet on mobile */}
      <aside
        ref={drawerRef}
        tabIndex={-1}
        aria-hidden={!isOpen}
        role="complementary"
        className={cn(
          // Desktop: slide from end (right in RTL, left in LTR)
          'fixed top-0 end-0 bottom-0 z-50',
          'glass border-s border-gold-500/10',
          'outline-none',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'hidden md:flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-[110%]',
          // RTL flip
          locale === 'he' && !isOpen && '-translate-x-0',
        )}
        style={{ width }}
      >
        {isOpen && children}
      </aside>

      {/* Mobile: bottom sheet */}
      <aside
        tabIndex={-1}
        aria-hidden={!isOpen}
        role="complementary"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'glass border-t border-gold-500/10 rounded-t-2xl',
          'outline-none',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'flex md:hidden flex-col',
          'h-[85dvh]',
          isOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-ink-600" />
        </div>
        {isOpen && children}
      </aside>
    </>
  )
}
