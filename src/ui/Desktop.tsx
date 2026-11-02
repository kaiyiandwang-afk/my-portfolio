import { Fragment, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { projects, resume, site } from '../content'
import { iconProps } from './icons'
import { SkillsList } from './Sections'
import { CardDetail } from './sections/shared'

const RESUME_ID = 'Résumé'
const APPS = [...projects.map(({ title }) => title), RESUME_ID]

interface OpenWindow {
  id: string
  x: number
  y: number
  minimized?: boolean
  maximized?: boolean
}

const HUES = [18, 205, 335, 160, 40, 265]
const hueOf = (i: number) => HUES[i % HUES.length]

/** A little drawing for each app. A new project without one falls back to its first letter. */
const APP_GLYPHS: Record<string, ReactNode> = {
  'RHA Storage Catalog': <path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" />,
  'U.S. Labor Market Dashboard': <path d="M4 20h16M7 20v-6M12 20V6M17 20v-9" />,
  'UB Gym Girls': <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />,
  Socra: <path d="M4 5h16v11H10l-4 4v-4H4zM8 9.500h8M8 12.500h5" />,
  [RESUME_ID]: <path d="M7 3h7l4 4v14H7zM14 3v4h4M12 10v6.500M9.500 14l2.500 2.500 2.500-2.500" />,
}
const HANNA_GLYPH = <path d="M5 21V5l8-2v18M13 9l6 2v10M3 21h18M8.500 8h1.500M8.500 12h1.500M8.500 16h1.500" />

function AppGlyph({ id }: { id: string }) {
  const glyph = APP_GLYPHS[id] ?? (id.startsWith('Hanna') ? HANNA_GLYPH : null)
  return glyph ? <svg {...iconProps}>{glyph}</svg> : <>{id[0]}</>
}

/** The hills out of the café's window, as a wallpaper. Follows the sky, like everything else. */
function Wallpaper() {
  return (
    <svg className="os-wall" viewBox="0 0 980 634" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="os-stars">
        {[[120, 70], [260, 130], [430, 60], [610, 110], [780, 66], [900, 150], [540, 190], [340, 210]].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="1.600" />
        ))}
      </g>
      <circle className="os-orb" cx="862" cy="296" r="44" />
      <path className="os-far" d="M0 372 150 300l130 56 150-92 170 104 130-60 250 90v236H0z" />
      <path className="os-mid" d="M0 452c120-58 230-62 350-16s240 28 340-14 190-34 290 6v206H0z" />
      <path className="os-near" d="M0 540c160-44 320-36 480-6s330 18 500-22v122H0z" />
    </svg>
  )
}

function DesktopWindow({
  win,
  zIndex,
  front,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
}: {
  win: OpenWindow
  zIndex: number
  front: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onMove: (x: number, y: number) => void
}) {
  const element = useRef<HTMLElement>(null)
  const project = projects.find(({ title }) => title === win.id)

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    onFocus()
    if ((event.target as HTMLElement).closest('button') || win.maximized) return
    const bar = event.currentTarget
    bar.setPointerCapture(event.pointerId)
    // This DOM is scaled onto the laptop in 3D, so on-screen pixels have to be converted back to layout pixels.
    const rect = element.current!.getBoundingClientRect()
    const scale = rect.width / element.current!.offsetWidth || 1
    const start = { px: event.clientX, py: event.clientY, x: win.x, y: win.y }
    const move = (next: PointerEvent) => onMove(start.x + (next.clientX - start.px) / scale, start.y + (next.clientY - start.py) / scale)
    const end = () => {
      bar.removeEventListener('pointermove', move)
      bar.removeEventListener('pointerup', end)
    }
    bar.addEventListener('pointermove', move)
    bar.addEventListener('pointerup', end)
  }

  return (
    <section
      ref={element}
      className={`os-window${front ? ' front' : ''}${win.minimized ? ' minimized' : ''}${win.maximized ? ' maximized' : ''}`}
      aria-label={win.id}
      inert={win.minimized}
      style={{ left: win.x, top: win.y, zIndex }}
      onPointerDown={onFocus}
    >
      <header onPointerDown={startDrag} onDoubleClick={onMaximize}>
        <button type="button" aria-label={`Close ${win.id}`} onClick={onClose} />
        <button type="button" aria-label={`Minimize ${win.id}`} onClick={onMinimize} />
        <button type="button" aria-label={`${win.maximized ? 'Restore' : 'Maximize'} ${win.id}`} onClick={onMaximize} />
        <span>{win.id}</span>
      </header>
      <div className="os-body">
        {project ? (
          <article className="os-card">
            <h3>{project.title}</h3>
            {project.role && <div className="role">{project.role}</div>}
            {project.dates && <div className="dates">{project.dates}</div>}
            <CardDetail card={project} />
          </article>
        ) : (
          <div className="os-card">
            <h3>{site.name}</h3>
            <SkillsList />
            <a className="btn-solid" href={resume.href} download={resume.filename}>
              Download résumé (PDF)
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

/** The tiny desktop on Kaiyi's laptop: one app per project, plus her résumé. Windows drag, stack and close. */
export function Desktop() {
  const [windows, setWindows] = useState<OpenWindow[]>([{ id: projects[0].title, x: 196, y: 54 }])
  const [now, setNow] = useState(() => new Date())
  const firstIcon = useRef<HTMLButtonElement>(null)
  const frontId = windows.filter((win) => !win.minimized).at(-1)?.id

  useEffect(() => {
    firstIcon.current?.focus({ preventScroll: true })
    const ticker = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(ticker)
  }, [])

  const toFront = (id: string) =>
    setWindows((list) => {
      const target = list.find((win) => win.id === id)
      return target ? [...list.filter((win) => win.id !== id), target] : list
    })

  const openApp = (id: string) =>
    setWindows((list) => {
      const existing = list.find((win) => win.id === id)
      if (existing) return [...list.filter((win) => win.id !== id), { ...existing, minimized: false }]
      const step = list.length % 5
      return [...list, { id, x: 196 + step * 28, y: 54 + step * 26 }]
    })

  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="os">
      <Wallpaper />
      <div className="os-bar">
        <b>{frontId ?? "kaiyi's laptop"}</b>
        <span className="os-status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.400" strokeLinecap="round" aria-hidden="true">
            <path d="M3 9.500a13 13 0 0 1 18 0M6.500 13a8 8 0 0 1 11 0M10 16.500a3 3 0 0 1 4 0" />
          </svg>
          <svg viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.800" aria-hidden="true">
            <rect x="2" y="7" width="21" height="10" rx="3" />
            <rect x="4" y="9" width="13" height="6" rx="1.500" fill="currentColor" stroke="none" />
            <path d="M25.500 10.500v3" strokeLinecap="round" />
          </svg>
          {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} {time}
        </span>
      </div>
      <div className="os-notch" aria-hidden="true" />

      <div className="os-widgets">
        <div className="os-clock" aria-hidden="true">
          <b>{time}</b>
          <span>{now.toLocaleDateString(undefined, { weekday: 'long' })}</span>
        </div>
        <p className="os-sticky">Drag a window by its top bar. Double-click the bar to fill the screen.</p>
      </div>

      <div className="os-icons">
        {APPS.map((id, i) => (
          <button key={id} ref={i === 0 ? firstIcon : undefined} type="button" onClick={() => openApp(id)}>
            <span className="os-icon" style={{ '--hue': `${hueOf(i)}` } as React.CSSProperties} aria-hidden="true">
              <AppGlyph id={id} />
            </span>
            <span>{id}</span>
          </button>
        ))}
      </div>
      {windows.map((win, i) => (
        <DesktopWindow
          key={win.id}
          win={win}
          zIndex={i + 1}
          front={win.id === frontId}
          onFocus={() => toFront(win.id)}
          onClose={() => setWindows((list) => list.filter(({ id }) => id !== win.id))}
          onMinimize={() => setWindows((list) => list.map((other) => (other.id === win.id ? { ...other, minimized: true } : other)))}
          onMaximize={() => setWindows((list) => list.map((other) => (other.id === win.id ? { ...other, maximized: !other.maximized } : other)))}
          onMove={(x, y) => setWindows((list) => list.map((other) => (other.id === win.id ? { ...other, x, y } : other)))}
        />
      ))}
      <div className="os-dock">
        {APPS.map((id, i) => (
          <Fragment key={id}>
            {id === RESUME_ID && <i className="os-dock-sep" aria-hidden="true" />}
            <button
              type="button"
              className={windows.some((win) => win.id === id) ? 'running' : undefined}
              aria-label={id}
              data-tip={id}
              style={{ '--hue': `${hueOf(i)}` } as React.CSSProperties}
              onClick={() => openApp(id)}
            >
              <AppGlyph id={id} />
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
