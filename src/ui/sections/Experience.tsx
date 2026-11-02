import { useRef, useState } from 'react'
import { FLYER_COLORS } from '../../config'
import { experience } from '../../content'
import { CardDetail, Unfold, useFlip } from './shared'

/** Flyers pinned to cork. Click one and it comes off the board to fill the width, while the rest shuffle out of its way. */
export function Experience() {
  const [open, setOpen] = useState<number | null>(0)
  const board = useRef<HTMLDivElement>(null)
  useFlip(board, open)
  return (
    <div className="cork" ref={board}>
      {experience.map((role, i) => {
        const isOpen = open === i
        return (
          <article
            key={role.title}
            className={isOpen ? 'flyer open' : 'flyer'}
            style={{ '--tilt': `${((i * 37) % 7) * 0.7 - 2}deg`, '--paper': FLYER_COLORS[i % FLYER_COLORS.length] } as React.CSSProperties}
          >
            <span className="pin" aria-hidden="true" />
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <b>{role.title}</b>
              {role.role && <small>{role.role}</small>}
              {role.dates && <em>{role.dates}</em>}
            </button>
            <Unfold open={isOpen}>
              <div className="flyer-more">
                <CardDetail card={role} />
              </div>
            </Unfold>
          </article>
        )
      })}
    </div>
  )
}
