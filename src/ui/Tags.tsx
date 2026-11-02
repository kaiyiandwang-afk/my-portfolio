import { useEffect, useRef } from 'react'
import { INTERACTIVES } from '../config'
import type { InteractiveId } from '../config'
import { interests, sections } from '../content'
import { useCafe } from '../state/store'
import { askAbout } from './sections/Interests'
import { useIsPhone } from './useIsPhone'

/** Written by the DOM here, read every frame by scene/TagProjector, which moves each tag over its object. */
export const tagElements = new Map<InteractiveId, HTMLElement>()
export const bubbleElement: { current: HTMLElement | null } = { current: null }
export const pillElements = new Map<number, HTMLElement>()

const SPEECH_SECONDS = 6

/** v1's tag layer: one pill per object, shown on hover or for all of them in Labels mode. */
export function Tags() {
  const labelsOn = useCafe((s) => s.labelsOn)
  const hovered = useCafe((s) => s.hovered)
  const atHome = useCafe((s) => s.cameraState === 'home')

  return (
    <div className="tags" aria-hidden="true">
      {INTERACTIVES.map(({ id, tag }) => (
        <span
          key={id}
          className={atHome && (labelsOn || hovered === id) ? 'tag on' : 'tag'}
          ref={(el) => {
            if (el) tagElements.set(id, el)
            else tagElements.delete(id)
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

/** v1's speech bubble over Kaiyi's head. */
export function SpeechBubble() {
  const speech = useCafe((s) => s.speech)
  const clearSpeech = useCafe((s) => s.clearSpeech)
  const atHome = useCafe((s) => s.cameraState === 'home')
  const lastText = useRef('')
  if (speech) lastText.current = speech.text

  useEffect(() => {
    if (!speech) return
    const timeout = window.setTimeout(clearSpeech, SPEECH_SECONDS * 1000)
    return () => window.clearTimeout(timeout)
  }, [speech, clearSpeech])

  return (
    <div
      className={speech && atHome ? 'bubble' : 'bubble gone'}
      role="status"
      ref={(el) => {
        bubbleElement.current = el
      }}
    >
      {lastText.current}
    </div>
  )
}

const INTRO = sections.find(({ id }) => id === 'interests')?.intro

/** Each interest riding above its ingredient at the hotpot. Phones get them in the bottom sheet instead. */
export function InterestPills() {
  const open = useCafe((s) => s.openSection === 'interests' && s.focus === 'hotpot')
  const phone = useIsPhone()
  if (!open || phone) return null
  return (
    <>
      <p className="pot-intro glass">{INTRO}</p>
      <ul className="tags pot-pills">
        {interests.map((interest, i) => (
          <li
            key={interest}
            className="pot-pill"
            style={{ '--delay': `${0.3 + i * 0.09}s`, '--phase': `${i * 0.37}s` } as React.CSSProperties}
            ref={(el) => {
              if (el) pillElements.set(i, el)
              else pillElements.delete(i)
            }}
          >
            <button
              type="button"
              onPointerEnter={() => useCafe.setState({ hoveredInterest: i })}
              onPointerLeave={() => useCafe.setState({ hoveredInterest: null })}
              onFocus={() => useCafe.setState({ hoveredInterest: i })}
              onBlur={() => useCafe.setState({ hoveredInterest: null })}
              onClick={() => askAbout(interest)}
            >
              {interest}
              <small>Ask me →</small>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
