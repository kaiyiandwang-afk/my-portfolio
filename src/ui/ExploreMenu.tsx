import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { INTERACTIVES } from '../config'
import { resume, sections } from '../content'
import type { SectionId } from '../content'
import { useCafe } from '../state/store'
import { SectionIcon } from './icons'
import { useIsPhone } from './useIsPhone'

const objectFor = (id: SectionId) => INTERACTIVES.find((candidate) => candidate.section === id)

/** Flies to the object that opens a section. Shared with the chalkboard. */
export function goToSection(id: SectionId) {
  const item = objectFor(id)
  if (item) useCafe.getState().activate(item.id)
}

/** A café's punch card: every section the visitor opens gets stamped with its little object. */
function LoyaltyCard() {
  const visited = useCafe((s) => s.visited)
  const full = visited.length === sections.length
  return (
    <div className={full ? 'punch full' : 'punch'} role="img" aria-label={`${visited.length} of ${sections.length} sections visited`}>
      <div className="punch-head">
        <b>Loyalty card</b>
        <span>{full ? 'All stamped. Thanks for coming by!' : `${visited.length} of ${sections.length} stamps`}</span>
      </div>
      <div className="punch-holes" aria-hidden="true">
        {sections.map(({ id }, i) => (
          <i key={id} className={visited.includes(id) ? 'on' : undefined} style={{ '--tilt': `${((i * 41) % 13) - 6}deg` } as React.CSSProperties}>
            {visited.includes(id) && <SectionIcon id={id} />}
          </i>
        ))}
      </div>
    </div>
  )
}

/**
 * v1's Explore menu, grown up: pointing at a row lights its object in the room and shows a taste of what's inside, so the
 * menu doubles as a map of the café. Arrow keys move through it.
 */
export function ExploreMenu() {
  const menuOpen = useCafe((s) => s.menuOpen)
  const atChalkboard = useCafe((s) => s.focus === 'chalkboard')
  const closeMenu = useCafe((s) => s.closeMenu)
  const setHovered = useCafe((s) => s.setHovered)
  const phone = useIsPhone()
  const visited = useCafe((s) => s.visited)
  const menu = useRef<HTMLDivElement>(null)
  const [peek, setPeek] = useState<SectionId | null>(null)
  // At the chalkboard on a larger screen, the board itself is the menu.
  const visible = menuOpen && (!atChalkboard || phone)

  useEffect(() => {
    if (visible) {
      menu.current?.querySelector<HTMLElement>('button, a')?.focus()
      return () => document.querySelector<HTMLElement>('.explore')?.focus({ preventScroll: true })
    }
    setPeek(null)
  }, [visible])

  if (!visible) return null

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('button, a') ?? [])]
    const current = items.indexOf(document.activeElement as HTMLElement)
    items[(current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  const light = (id: SectionId | null) => {
    setPeek(id)
    setHovered(id && objectFor(id) ? objectFor(id)!.id : null)
  }

  const peeking = sections.find(({ id }) => id === peek)

  return (
    <div className="menu glass" id="explore-menu" ref={menu} onKeyDown={onKeyDown} onPointerLeave={() => light(null)}>
      <p className="menu-title">Explore the café</p>
      <div className="menu-rows">
        {sections.map(({ id, title, object }, i) => (
          <button
            key={id}
            type="button"
            className={visited.includes(id) ? 'seen' : undefined}
            style={{ '--n': i } as React.CSSProperties}
            onPointerEnter={() => light(id)}
            onFocus={() => light(id)}
            onClick={() => {
              light(null)
              goToSection(id)
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              <SectionIcon id={id} />
            </span>
            <span className="menu-text">
              {title}
              <small>{object.replace(/^The /, '')}</small>
            </span>
            <span className="menu-go" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>
      <div className="menu-peek" aria-hidden="true">
        <p key={peek ?? 'none'}>{peeking?.intro ?? 'Point at something and it lights up in the room.'}</p>
      </div>
      <LoyaltyCard />
      <a className="menu-resume" href={resume.href} download={resume.filename} onClick={closeMenu}>
        {resume.label}
        <small>Download PDF ↓</small>
      </a>
      <a className="menu-plain" href="?text">
        Read it all as plain text
      </a>
    </div>
  )
}
