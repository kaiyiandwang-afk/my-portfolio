import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { SECTION_TINTS } from '../config'
import { resume, sections } from '../content'
import type { SectionId } from '../content'
import { isPhone, usesDrawer } from '../state/panels'
import { useCafe } from '../state/store'
import { goToSection } from './ExploreMenu'
import { iconProps, SectionIcon } from './icons'
import { SectionBody } from './Sections'

const CLOSE_MS = 400
const SWIPE_TO_CLOSE = 90
const SCROLL_FADE = 22

/**
 * v1's slide-in glass drawer, which becomes a bottom sheet on phones. Keeps focus inside while open and hands it back
 * on close. A rail of little objects along the top, and the arrow keys, walk straight from one section to the next, and
 * every drawer footer has the résumé, so a recruiter is never more than a click away.
 */
export function Drawer() {
  const focus = useCafe((s) => s.focus)
  const openSection = useCafe((s) => s.openSection)
  const back = useCafe((s) => s.back)
  const setHovered = useCafe((s) => s.setHovered)
  const lightboxOpen = useCafe((s) => s.lightbox !== null)
  const visited = useCafe((s) => s.visited)
  const wanted: SectionId | null = openSection && focus && usesDrawer(focus) ? openSection : null

  // Hold on to the last section while the drawer slides away, so its content doesn't vanish mid-slide.
  const [shown, setShown] = useState<SectionId | null>(null)
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (wanted) {
      lastFocus.current = document.activeElement as HTMLElement
      setShown(wanted)
      const frame = requestAnimationFrame(() => {
        setOpen(true)
        closeButton.current?.focus({ preventScroll: true })
      })
      return () => cancelAnimationFrame(frame)
    }
    setOpen(false)
    lastFocus.current?.focus?.()
    const timeout = window.setTimeout(() => setShown(null), CLOSE_MS)
    return () => window.clearTimeout(timeout)
  }, [wanted])

  // The reading line, and a soft fade on whichever edge has more to scroll to. Sections grow and shrink as cards unfold.
  const measure = () => {
    const element = body.current
    if (!element) return
    const { scrollTop, scrollHeight, clientHeight } = element
    const room = scrollHeight - clientHeight
    panel.current?.style.setProperty('--read', `${room > 0 ? scrollTop / room : 0}`)
    element.style.setProperty('--fade-top', `${Math.min(scrollTop, SCROLL_FADE)}px`)
    element.style.setProperty('--fade-bottom', `${Math.min(Math.max(room - scrollTop, 0), SCROLL_FADE)}px`)
  }

  useEffect(() => {
    const element = body.current
    if (!element) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    return () => observer.disconnect()
  }, [shown])

  if (!shown) return null
  const index = sections.findIndex(({ id }) => id === shown)
  const section = sections[index]
  const previous = sections[(index - 1 + sections.length) % sections.length]
  const next = sections[(index + 1) % sections.length]

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') goToSection(previous.id)
    if (event.key === 'ArrowRight') goToSection(next.id)
    if (event.key !== 'Tab' || !panel.current) return
    const items = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  // On a phone, the sheet's top edge can be pulled down to send it away.
  const startSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const sheet = panel.current
    if (!sheet || !isPhone() || (event.target as HTMLElement).closest('button')) return
    const handle = event.currentTarget
    const start = event.clientY
    let pulled = 0
    handle.setPointerCapture(event.pointerId)
    sheet.style.transition = 'none'
    const move = (next: PointerEvent) => {
      pulled = Math.max(0, next.clientY - start)
      sheet.style.transform = `translateY(${pulled}px)`
    }
    const end = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', end)
      handle.removeEventListener('pointercancel', end)
      sheet.style.transition = ''
      sheet.style.transform = ''
      if (pulled > SWIPE_TO_CLOSE) back()
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', end)
    handle.addEventListener('pointercancel', end)
  }

  return (
    <>
      <div className={open ? 'scrim open' : 'scrim'} onClick={back} aria-hidden="true" />
      <aside
        ref={panel}
        className={open ? 'drawer glass open' : 'drawer glass'}
        style={{ '--tint': SECTION_TINTS[shown] } as CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        inert={lightboxOpen}
        onKeyDown={onKeyDown}
      >
        <div className="dhead" onPointerDown={startSwipe}>
          <span className="dhead-icon" key={`icon-${shown}`} aria-hidden="true">
            <SectionIcon id={shown} />
          </span>
          <div className="dhead-title" key={shown}>
            <p className="kicker">{section.object}</p>
            <h2 id="drawer-title">{section.title}</h2>
          </div>
          <button ref={closeButton} className="close" type="button" aria-label="Close" data-tip="Back to the café · Esc" onClick={back}>
            <svg {...iconProps} strokeWidth={2.2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="rail" aria-label="Sections" style={{ '--i': index, '--count': sections.length } as CSSProperties}>
          <span className="rail-mark" aria-hidden="true" />
          {sections.map(({ id, title }) => (
            <button
              key={id}
              type="button"
              className={visited.includes(id) ? 'seen' : undefined}
              aria-label={title}
              aria-current={id === shown ? 'true' : undefined}
              data-tip={title}
              onClick={() => id !== shown && goToSection(id)}
            >
              <SectionIcon id={id} />
            </button>
          ))}
        </nav>
        <div className="read" aria-hidden="true" />

        <div className="dbody" key={shown} ref={body} onScroll={measure}>
          {section.intro && <p className="intro">{section.intro}</p>}
          <SectionBody id={shown} />
        </div>

        <div className="dfoot">
          <button type="button" onClick={() => goToSection(previous.id)} onPointerEnter={() => setHovered(null)}>
            <span aria-hidden="true">←</span> {previous.short ?? previous.title}
          </button>
          <a href={resume.href} download={resume.filename}>
            <svg {...iconProps} strokeWidth={2.2}>
              <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
            </svg>
            <span>{resume.label}</span>
          </a>
          <button type="button" onClick={() => goToSection(next.id)}>
            {next.short ?? next.title} <span aria-hidden="true">→</span>
          </button>
        </div>
      </aside>
    </>
  )
}
