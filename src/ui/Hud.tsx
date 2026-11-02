import { useEffect, useState } from 'react'
import { resume, site } from '../content'
import { useCafe } from '../state/store'

const icon = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true } as const

function Badge() {
  const activate = useCafe((s) => s.activate)
  const setHovered = useCafe((s) => s.setHovered)
  return (
    <div className="hud tl">
      <button
        className="who glass"
        type="button"
        aria-label={`${site.badge.title}. Talk to Kaiyi`}
        onClick={() => activate('kaiyi')}
        onPointerEnter={() => setHovered('kaiyi')}
        onPointerLeave={() => setHovered(null)}
      >
        <div className="av" aria-hidden="true">
          K
        </div>
        <div>
          <b>{site.badge.title}</b>
          <span className="who-sub">
            <span>{site.badge.subtitle}</span>
            <span aria-hidden="true">Come say hi →</span>
          </span>
        </div>
      </button>
      <MiniTimer />
    </div>
  )
}

/** Sun by day, moon by night: a little sky in a switch, whose knob travels across it. */
function DayNightSwitch() {
  const timeOfDay = useCafe((s) => s.timeOfDay)
  const toggleTimeOfDay = useCafe((s) => s.toggleTimeOfDay)
  const night = timeOfDay === 'night'
  return (
    <button
      className={night ? 'skyswitch glass night' : 'skyswitch glass'}
      type="button"
      role="switch"
      aria-checked={night}
      aria-label="Night mode"
      data-tip={night ? 'Back to daylight' : 'Stay until dark'}
      onClick={toggleTimeOfDay}
    >
      <span className="sky-inner" aria-hidden="true">
        <span className="sky-stars">
          <i />
          <i />
          <i />
        </span>
        <span className="sky-knob" />
      </span>
    </button>
  )
}

function Controls() {
  const soundOn = useCafe((s) => s.soundOn)
  const toggleSound = useCafe((s) => s.toggleSound)
  const labelsOn = useCafe((s) => s.labelsOn)
  const toggleLabels = useCafe((s) => s.toggleLabels)
  const menuOpen = useCafe((s) => s.menuOpen)
  const toggleMenu = useCafe((s) => s.toggleMenu)

  return (
    <nav className="hud tr" aria-label="Café controls">
      <button className={soundOn ? 'btn glass playing' : 'btn glass'} type="button" aria-pressed={soundOn} aria-label="Lo-fi music" data-tip={soundOn ? 'Quiet, please' : 'Put a record on'} onClick={toggleSound}>
        <span className="eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="lbl">Lo-fi</span>
      </button>
      <DayNightSwitch />
      <button className="btn glass" type="button" aria-pressed={labelsOn} aria-label="Show labels" data-tip="Name everything · L" onClick={toggleLabels}>
        <svg {...icon}>
          <path d="M20 12l-8 8-9-9V3h8z" />
          <circle cx="7.5" cy="7.5" r="1.5" />
        </svg>
        <span className="lbl">Labels</span>
      </button>
      <a className="btn glass nudge" href={resume.href} download={resume.filename} aria-label="Download résumé" data-tip="Download the PDF">
        <svg {...icon}>
          <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
        </svg>
        <span className="lbl">{resume.label}</span>
      </a>
      <button className={menuOpen ? 'btn glass explore open' : 'btn glass explore'} type="button" aria-expanded={menuOpen} aria-controls="explore-menu" onClick={toggleMenu}>
        <span className="burger" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        Explore
      </button>
    </nav>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  const [hours24, setHours24] = useState(false)
  useEffect(() => {
    const ticker = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(ticker)
  }, [])
  const hours = now.getHours()
  const shown = hours24 ? hours : hours % 12 || 12
  return (
    <div className="hud bl">
      <div className="date">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <button className="time" type="button" aria-label={`The time. Switch to ${hours24 ? '12' : '24'} hour`} onClick={() => setHours24(!hours24)}>
        {String(shown).padStart(2, '0')}
        <span className="colon" aria-hidden="true">
          :
        </span>
        {String(now.getMinutes()).padStart(2, '0')}
        {!hours24 && <small>{hours >= 12 ? 'PM' : 'AM'}</small>}
      </button>
    </div>
  )
}

const CIRCUMFERENCE = 289.03
const LENGTH = { focus: 25 * 60, break: 5 * 60 }

function Timer() {
  const { mode, secondsLeft, running } = useCafe((s) => s.timer)
  const toggleTimer = useCafe((s) => s.toggleTimer)
  const resetTimer = useCafe((s) => s.resetTimer)
  const skipTimer = useCafe((s) => s.skipTimer)
  const left = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  const caption = mode === 'break' ? 'Break' : running ? 'Focus' : 'Start'

  return (
    <div className="hud br">
      <div className="timer-tools">
        <button className="glass" type="button" onClick={resetTimer}>
          Reset
        </button>
        <button className="glass" type="button" onClick={skipTimer}>
          {mode === 'focus' ? 'Take a break' : 'Back to focus'}
        </button>
      </div>
      <button
        className={`timer glass${mode === 'break' ? ' break' : ''}${running ? ' running' : ''}`}
        type="button"
        aria-label={`${running ? 'Pause' : 'Start'} ${mode} timer, ${left} left`}
        onClick={toggleTimer}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="track" cx="50" cy="50" r="46" />
          <circle
            className="prog"
            cx="50"
            cy="50"
            r="46"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - secondsLeft / LENGTH[mode])}
          />
        </svg>
        <div>
          <span className="t">{left}</span>
          <span className="m">
            <span>{caption}</span>
            <span aria-hidden="true">{running ? 'Pause' : 'Start'}</span>
          </span>
        </div>
      </button>
    </div>
  )
}

/** Close-ups hide the big timer, so while it's running a small one keeps it company next to the badge. */
function MiniTimer() {
  const { mode, secondsLeft, running } = useCafe((s) => s.timer)
  const away = useCafe((s) => s.focus !== null)
  const toggleTimer = useCafe((s) => s.toggleTimer)
  if (!away || !running) return null
  const left = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  return (
    <button className={`mini-timer glass${mode === 'break' ? ' break' : ''}`} type="button" aria-label={`Pause ${mode} timer, ${left} left`} onClick={toggleTimer}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="track" cx="18" cy="18" r="14" />
        <circle className="prog" cx="18" cy="18" r="14" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - secondsLeft / LENGTH[mode]} />
      </svg>
      {left}
    </button>
  )
}

/** v1's four corners: name, controls, date and time, focus timer. */
export function Hud() {
  return (
    <>
      <Badge />
      <Controls />
      <Clock />
      <Timer />
    </>
  )
}
