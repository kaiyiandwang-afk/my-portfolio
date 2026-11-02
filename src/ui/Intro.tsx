import { useEffect, useRef, useState } from 'react'
import { unlockAudio } from '../audio/mixer'
import { site } from '../content'
import { useCafe } from '../state/store'

const FADE_MS = 900

/**
 * The way in: a coffee cup fills as the café loads, then "Step inside". The click is also what lets the browser play
 * sound later on. It only appears over the page, and the scene is built underneath it.
 */
export function Intro() {
  const ready = useCafe((s) => s.sceneReady)
  const entered = useCafe((s) => s.entered)
  const enter = useCafe((s) => s.enter)
  const [gone, setGone] = useState(entered)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (ready) button.current?.focus({ preventScroll: true })
  }, [ready])

  useEffect(() => {
    if (!entered) return
    const timeout = window.setTimeout(() => setGone(true), FADE_MS)
    return () => window.clearTimeout(timeout)
  }, [entered])

  if (gone) return null

  return (
    <div className={`way-in${ready ? ' ready' : ''}${entered ? ' leaving' : ''}`} aria-busy={!ready}>
      <div className="intro-cup" aria-hidden="true">
        <i className="wisp" />
        <i className="wisp" />
        <div className="intro-mug">
          <i className="intro-coffee" />
        </div>
        <div className="intro-saucer" />
      </div>
      <h1>{site.badge.title}</h1>
      <p>{site.name}</p>
      <div className="intro-action">
        <p className="intro-wait" role="status">
          {ready ? '' : 'Brewing…'}
        </p>
        <button
          ref={button}
          type="button"
          className="intro-enter"
          disabled={!ready}
          onClick={() => {
            unlockAudio()
            enter()
          }}
        >
          Step inside
        </button>
      </div>
      <a className="intro-plain" href="?text">
        Prefer plain text?
      </a>
    </div>
  )
}

const HINT_MS = 6500

/** One hint after arriving, gone at the first click. */
export function Hint() {
  const hinting = useCafe((s) => s.hinting)
  const focus = useCafe((s) => s.focus)
  const menuOpen = useCafe((s) => s.menuOpen)
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches)

  useEffect(() => {
    if (!hinting) return
    const timeout = window.setTimeout(() => useCafe.setState({ hinting: false }), HINT_MS)
    return () => window.clearTimeout(timeout)
  }, [hinting])

  // Anything the visitor does means they've found their way, so it stops being needed.
  useEffect(() => {
    if (focus || menuOpen) useCafe.setState({ hinting: false })
  }, [focus, menuOpen])

  if (!hinting) return null
  return (
    <p className="hint glass" role="status">
      {touch ? 'Tap' : 'Click'} anything that glows ✨
    </p>
  )
}
