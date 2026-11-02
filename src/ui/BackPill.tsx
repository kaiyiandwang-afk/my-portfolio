import { usesDrawer } from '../state/panels'
import { useCafe } from '../state/store'

/** The way back from in-world views like the laptop and Kaiyi's conversation. Drawers have their own close button. */
export function BackPill() {
  const focus = useCafe((s) => s.focus)
  const back = useCafe((s) => s.back)
  if (focus === null || usesDrawer(focus)) return null

  return (
    <button type="button" className="back-pill glass" onClick={back}>
      <span aria-hidden="true">←</span> Back to the café
      <kbd aria-hidden="true">Esc</kbd>
    </button>
  )
}
