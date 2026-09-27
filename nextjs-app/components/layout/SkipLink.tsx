'use client'

interface SkipLinkProps {
  label: string
  /** Id of the element the link points to. */
  target?: string
  /**
   * Selectors tried in order for the element to focus: the target itself by
   * default, then the page's first <main> or <h1> on pages without #main.
   */
  focus?: string
}

/**
 * Skip link: hidden until it receives keyboard focus, then shown as a pill at
 * the top-start corner (styles: .skip-link in globals.css).
 *
 * It works as a plain in-page link without JavaScript. With JavaScript it also
 * moves focus, not just the scroll position.
 */
export function SkipLink({ label, target = 'main', focus }: SkipLinkProps) {
  return (
    <a
      href={`#${target}`}
      className="skip-link"
      onClick={e => {
        const selectors = [focus, `#${target}`, 'main', '[role="main"]', 'h1'].filter(Boolean) as string[]
        let el: HTMLElement | null = null
        for (const sel of selectors) {
          el = document.querySelector<HTMLElement>(sel)
          if (el) break
        }
        if (!el) return
        e.preventDefault()
        if (!el.hasAttribute('tabindex') && !el.matches('a[href], button, input, select, textarea')) {
          el.setAttribute('tabindex', '-1')
        }
        el.focus()
      }}
    >
      {label}
    </a>
  )
}
