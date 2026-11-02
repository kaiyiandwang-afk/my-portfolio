import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { creative } from '../../content'
import { CardDetail, prefersReducedMotion, tabKeys } from './shared'

const FRAME_TONES = ['#c9794f', '#5b7f8c', '#8d6a9f', '#b5a04a']

/** A strip of film: drag it along, and pick a frame to look at it properly. */
export function Creative() {
  const [selected, setSelected] = useState(0)
  const strip = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false })
  const card = creative[selected]

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return // touch already scrolls
    drag.current = { active: true, startX: event.clientX, startScroll: event.currentTarget.scrollLeft, moved: false }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return
    const distance = event.clientX - drag.current.startX
    if (Math.abs(distance) > 4) drag.current.moved = true
    event.currentTarget.scrollLeft = drag.current.startScroll - distance
  }
  const end = () => {
    drag.current.active = false
  }
  // Whichever frame gets picked rolls to the middle of the strip.
  const pick = (i: number) => {
    setSelected(i)
    const film = strip.current
    const frame = film?.querySelectorAll<HTMLElement>('[role="tab"]')[i]
    if (film && frame) film.scrollTo({ left: frame.offsetLeft - (film.clientWidth - frame.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div className="film-wrap">
        <span className="film-edge" aria-hidden="true">
          KAIYI 400 · {String(selected + 1).padStart(2, '0')}A
        </span>
        <div className="film" ref={strip} role="tablist" aria-label="Design and film work" onKeyDown={(event) => tabKeys(event, selected, creative.length, pick)} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerLeave={end}>
          {creative.map((item, i) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              tabIndex={i === selected ? 0 : -1}
              aria-selected={i === selected}
              className="frame"
              style={{ '--tone': FRAME_TONES[i % FRAME_TONES.length] } as React.CSSProperties}
              onClick={() => {
                if (!drag.current.moved) pick(i)
              }}
            >
              <span className="frame-no">{i + 1}A</span>
              <b>{item.title}</b>
            </button>
          ))}
        </div>
      </div>
      <article className="page exposed" key={card.title} role="tabpanel">
        <h3>{card.title}</h3>
        {card.role && <div className="role">{card.role}</div>}
        <CardDetail card={card} />
      </article>
    </>
  )
}
