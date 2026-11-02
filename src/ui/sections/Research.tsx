import { useState } from 'react'
import { research } from '../../content'
import { CardDetail, tabKeys } from './shared'

const SPINES = ['#b8503f', '#3f7a6c', '#c98b2e']
/** Other books on the shelf, for company: width, height and color. */
const FILLERS: [number, number, string][] = [
  [16, 92, '#54607f'],
  [22, 108, '#a4495e'],
  [14, 84, '#d8c6a4'],
  [18, 100, '#6d8a5a'],
]

/** Three books on a shelf. Pull one out to read it. */
export function Research() {
  const [selected, setSelected] = useState(0)
  const card = research[selected]
  return (
    <>
      <div className="shelf" role="tablist" aria-label="Research projects" onKeyDown={(event) => tabKeys(event, selected, research.length, setSelected)}>
        <span className="filler" style={{ width: FILLERS[0][0], height: FILLERS[0][1], background: FILLERS[0][2] }} />
        {research.map((item, i) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-selected={i === selected}
            className="spine"
            tabIndex={i === selected ? 0 : -1}
            style={{ '--spine': SPINES[i % SPINES.length], '--n': i } as React.CSSProperties}
            onClick={() => setSelected(i)}
          >
            <span>{item.title}</span>
          </button>
        ))}
        {FILLERS.slice(1).map(([width, height, background]) => (
          <span key={background} className="filler" style={{ width, height, background }} />
        ))}
      </div>
      <article className="page turned" key={card.title} role="tabpanel" style={{ '--spine': SPINES[selected % SPINES.length] } as React.CSSProperties}>
        <i className="ribbon" aria-hidden="true" />
        <h3>{card.title}</h3>
        {card.role && <div className="role">{card.role}</div>}
        {card.dates && <div className="dates">{card.dates}</div>}
        <CardDetail card={card} />
      </article>
    </>
  )
}
