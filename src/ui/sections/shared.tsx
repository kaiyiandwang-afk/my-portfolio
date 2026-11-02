import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react'
import type { Card, Stat } from '../../content'

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Moves the soft light that follows the pointer across a card. The styling is `.spot` in panels.css. */
export function trackSpot(event: PointerEvent<HTMLElement>) {
  const { left, top } = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--mx', `${event.clientX - left}px`)
  event.currentTarget.style.setProperty('--my', `${event.clientY - top}px`)
}

/** Left and right move through a strip of tabs while it has focus, rather than walking to the next section. */
export function tabKeys(event: KeyboardEvent<HTMLElement>, selected: number, count: number, select: (i: number) => void) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.stopPropagation()
  const next = (selected + (event.key === 'ArrowRight' ? 1 : -1) + count) % count
  select(next)
  event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
}

/** Counts a figure up from zero when it appears, keeping whatever surrounds the number: $, K, %, +. */
export function CountUp({ value }: { value: string }) {
  const match = value.match(/^([^\d]*)([\d,.]+)(.*)$/)
  const [shown, setShown] = useState(prefersReducedMotion() || !match ? value : '')
  useEffect(() => {
    if (!match || prefersReducedMotion()) return
    const [, before, digits, after] = match
    const target = Number(digits.replace(/,/g, ''))
    const decimals = digits.split('.')[1]?.length ?? 0
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 1100)
      const eased = 1 - (1 - t) ** 3
      const number = (target * eased).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      setShown(`${before}${digits.includes(',') ? number : number.replace(/,/g, '')}${after}`)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span aria-label={value}>{shown || value}</span>
}

export function Highlights({ stats }: { stats?: Stat[] }) {
  if (!stats?.length) return null
  return (
    <dl className="highlights">
      {stats.map(({ value, label }) => (
        <div key={label}>
          <dt>
            <CountUp value={value} />
          </dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A card's body, bullets, tags and links: everything below its heading. */
export function CardDetail({ card }: { card: Card }) {
  const { body, bullets, status, tags, links, highlights } = card
  return (
    <>
      <Highlights stats={highlights} />
      {body && <p>{body}</p>}
      {bullets && (
        <ul>
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {(status || tags) && (
        <div className="pills">
          {status && <span className="pill status">{status}</span>}
          {tags?.map((tag) => (
            <span className="pill" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {links?.map((link) => (
        <a className="go" key={link.href} href={link.href} target="_blank" rel="noopener">
          {link.label} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </>
  )
}

/** Height that animates to fit its content, with no measuring. */
export function Unfold({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={open ? 'unfold open' : 'unfold'} inert={!open}>
      <div>{children}</div>
    </div>
  )
}

/** A card that opens and closes on click, and carries a soft light under the pointer. */
export function FoldCard({ card, startOpen = false }: { card: Card; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const id = useId()
  return (
    <article className={open ? 'fold spot open' : 'fold spot'} onPointerMove={trackSpot}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span>
          <b>{card.title}</b>
          {card.role && <small>{card.role}</small>}
          {card.dates && <em>{card.dates}</em>}
        </span>
        <i aria-hidden="true" />
      </button>
      <Unfold open={open}>
        <div className="fold-body" id={id}>
          <CardDetail card={card} />
        </div>
      </Unfold>
    </article>
  )
}

/**
 * When children of a container change places, they glide there instead of jumping: measures every child before and after
 * each change of `key`, then plays the difference.
 */
export function useFlip(container: RefObject<HTMLElement | null>, key: unknown) {
  const previous = useRef(new Map<Element, DOMRect>())
  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    const next = new Map<Element, DOMRect>()
    for (const child of element.children) next.set(child, child.getBoundingClientRect())
    if (!prefersReducedMotion()) {
      next.forEach((rect, child) => {
        const before = previous.current.get(child)
        if (!before || (before.left === rect.left && before.top === rect.top)) return
        child.animate(
          [{ translate: `${before.left - rect.left}px ${before.top - rect.top}px` }, { translate: '0 0' }],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      })
    }
    previous.current = next
  }, [container, key])
}
