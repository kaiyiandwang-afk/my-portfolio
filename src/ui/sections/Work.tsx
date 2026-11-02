import { work } from '../../content'
import { useCafe } from '../../state/store'
import { CardDetail } from './shared'

/** Pull a shot: each press fills the cup a little further, here and under the machine in the room. */
function PullAShot() {
  const shots = useCafe((s) => s.shots)
  const pouring = useCafe((s) => s.pouring)
  const full = shots >= 3
  const pull = () => {
    if (pouring) return
    if (full) {
      useCafe.setState({ shots: 0 })
      return
    }
    useCafe.setState({ pouring: true })
    window.setTimeout(() => useCafe.setState((s) => ({ pouring: false, shots: s.shots + 1 })), 900)
  }
  return (
    <div className={pouring ? 'shot pouring' : 'shot'} style={{ '--fill': shots / 3 } as React.CSSProperties}>
      <div className="shot-cup" aria-hidden="true">
        <i className="stream" />
        <div className="cup">
          <i />
        </div>
      </div>
      <div className="shot-side">
        <div className="shot-pips" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i key={i} className={i < shots ? 'on' : undefined} />
          ))}
        </div>
        <small>The machine in the room pours it too.</small>
      </div>
      <button type="button" className="btn-solid" onClick={pull} disabled={pouring}>
        {pouring ? 'Pulling…' : full ? 'Enjoy. Another?' : shots === 0 ? 'Pull a shot' : 'One more'}
      </button>
      <span className="sr-only" role="status">
        {shots} of 3 shots pulled
      </span>
    </div>
  )
}

/** The jobs as order tickets, torn off the printer. */
export function Work() {
  return (
    <>
      <PullAShot />
      {work.map((card, i) => (
        <article className="ticket" key={card.title} style={{ '--n': i } as React.CSSProperties}>
          <header>
            <span>Order</span>
            <span>#{String(i + 1).padStart(2, '0')}</span>
          </header>
          <h3>{card.title}</h3>
          {card.role && (
            <div className="leader">
              <span>{card.role}</span>
              {card.dates && <span>{card.dates}</span>}
            </div>
          )}
          <CardDetail card={card} />
          <i className="barcode" aria-hidden="true" />
        </article>
      ))}
    </>
  )
}
