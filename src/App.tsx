import { Suspense, lazy, useEffect } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { useCafe } from './state/store'
import { lines } from './content'
import { BackPill } from './ui/BackPill'
import { Conversation } from './ui/Conversation'
import { Drawer } from './ui/Drawer'
import { ExploreMenu } from './ui/ExploreMenu'
import { Hud } from './ui/Hud'
import { Hint, Intro } from './ui/Intro'
import { Lightbox } from './ui/Lightbox'
import { InterestPills, SpeechBubble, Tags } from './ui/Tags'

// Dev only. Add ?clean to the URL to hide it for screenshots.
const TuningPanel =
  import.meta.env.DEV && !location.search.includes('clean') ? lazy(() => import('./ui/TuningPanel')) : null

// The 3D scene is the heavy part, so it's its own download that starts once this page has appeared.
const Experience = lazy(() => import('./scene/Experience').then(({ Experience }) => ({ default: Experience })))

const GREETING_DELAY = 900

/** If the scene can't run at all, the site's words are still all there: fall back to the plain page. */
class SceneBoundary extends Component<{ children: ReactNode }> {
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
    location.replace('?text')
  }
  static getDerivedStateFromError() {
    return null
  }
  override render() {
    return this.props.children
  }
}

/** The camera section's shutter: one quick white flash on arrival. */
function ShutterFlash() {
  const flashing = useCafe((s) => s.openSection === 'creative')
  return flashing && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? <div className="shutter" aria-hidden="true" /> : null
}

export function App() {
  const timeOfDay = useCafe((s) => s.timeOfDay)
  useEffect(() => {
    document.documentElement.dataset.time = timeOfDay
  }, [timeOfDay])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // peel back one layer at a time
        const state = useCafe.getState()
        if (state.lightbox) state.closeLightbox()
        else if (state.menuOpen && state.focus !== 'chalkboard') state.closeMenu()
        else state.back()
      }
      if (e.key.toLowerCase() === 'l' && !e.metaKey && !e.ctrlKey) useCafe.getState().toggleLabels()
    }
    window.addEventListener('keydown', onKey)
    const ticker = window.setInterval(() => useCafe.getState().tickTimer(), 1000)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearInterval(ticker)
    }
  }, [])

  // v1's hello, a beat after arriving
  const entered = useCafe((s) => s.entered)
  const closeUp = useCafe((s) => s.focus !== null)
  useEffect(() => {
    if (!entered) return
    const hello = window.setTimeout(() => useCafe.getState().say(lines[0]), GREETING_DELAY)
    return () => window.clearTimeout(hello)
  }, [entered])

  return (
    <div id="app" className={entered ? undefined : 'outside'} data-view={closeUp ? 'close' : 'home'}>
      <a className="skip" href="?text">
        Skip to the plain text version
      </a>
      <SceneBoundary>
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </SceneBoundary>
      <Tags />
      <SpeechBubble />
      <InterestPills />
      <Conversation />
      <Hud />
      <ExploreMenu />
      <BackPill />
      <Drawer />
      <Lightbox />
      <ShutterFlash />
      <Hint />
      <Intro />
      {TuningPanel && (
        <Suspense fallback={null}>
          <TuningPanel />
        </Suspense>
      )}
    </div>
  )
}
