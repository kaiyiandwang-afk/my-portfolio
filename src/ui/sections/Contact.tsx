import { useRef, useState } from 'react'
import { playSound } from '../../audio/mixer'
import { contact, resume } from '../../content'
import { useCafe } from '../../state/store'
import { iconProps } from '../icons'

const HOLE_RADIUS = 104
const STOP_ANGLE = 118
const ANGLES = [-152, -108, -64, -20, 24]

type Line = { id: string; label: string; detail: string; icon: React.ReactNode; href?: string; download?: string }

const LINES: Line[] = [
  { id: 'email', label: 'Email', detail: 'Copy my address', icon: <path d="M3 6.5h18v11H3zM3.5 7l8.5 6.5L20.5 7" /> },
  ...contact.links.map(({ label, href }): Line => ({
    id: label,
    label,
    detail: href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
    href,
    icon:
      label === 'LinkedIn' ? (
        <path d="M5 9.5v9M5 5.5v.01M10 18.5v-9M10 13c0-2 1.5-3.5 3.5-3.5S17 11 17 13v5.5" />
      ) : label === 'GitHub' ? (
        <path d="M9 19c-4 1.2-4-2-6-2.5m12 5v-3.3c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.600 11.600 0 0 0-6 0C7.300 2.700 6.300 3 6.300 3a4.300 4.300 0 0 0-.1 3.200A4.600 4.600 0 0 0 4.900 9.400c0 4.600 2.700 5.700 5.500 6-.6.6-.6 1.200-.5 2V21" />
      ) : (
        <>
          <rect x="4" y="4" width="16" height="16" rx="4.500" />
          <circle cx="12" cy="12" r="3.500" />
          <path d="M16.800 7.200v.01" />
        </>
      ),
  })),
  { id: 'resume', label: resume.label, detail: 'Download the PDF', href: resume.href, download: resume.filename, icon: <path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 20h14" /> },
]

/**
 * The telephone's rotary dial, and it really dials: click a hole and the wheel turns it round to the finger stop, then
 * springs home. The holes are real links, in a fixed layer above the moving wheel, so they never slide out from under you.
 */
function RotaryDial({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [turn, setTurn] = useState(0)
  const returning = useRef(0)

  const dial = (i: number) => {
    window.clearTimeout(returning.current)
    setTurn(STOP_ANGLE - ANGLES[i])
    playSound('dial')
    returning.current = window.setTimeout(() => setTurn(0), 620)
  }

  const line = hovered === null ? null : LINES[hovered]

  return (
    <div className="dial" style={{ '--turn': `${turn}deg` } as React.CSSProperties}>
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <mask id="dial-holes">
            <rect width="300" height="300" fill="#fff" />
            {ANGLES.map((angle) => (
              <circle key={angle} cx={150 + HOLE_RADIUS * Math.sin((angle * Math.PI) / 180)} cy={150 - HOLE_RADIUS * Math.cos((angle * Math.PI) / 180)} r="25" fill="#000" />
            ))}
          </mask>
          <radialGradient id="dial-wheel" cx="38%" cy="30%" r="85%">
            <stop offset="0" stopColor="#f0695c" />
            <stop offset="0.7" stopColor="#c23a32" />
            <stop offset="1" stopColor="#8f2620" />
          </radialGradient>
        </defs>
        <circle className="dial-plate" cx="150" cy="150" r="146" />
        {LINES.map(({ id, icon }, i) => {
          const a = (ANGLES[i] * Math.PI) / 180
          return (
            <g key={id} className={hovered === i ? 'dial-icon lit' : 'dial-icon'} transform={`translate(${150 + HOLE_RADIUS * Math.sin(a) - 15} ${150 - HOLE_RADIUS * Math.cos(a) - 15}) scale(1.25)`}>
              <g {...iconProps}>{icon}</g>
            </g>
          )
        })}
        <g className="dial-wheel">
          <circle cx="150" cy="150" r="134" fill="url(#dial-wheel)" mask="url(#dial-holes)" />
        </g>
        <path className="dial-stop" d={`M ${150 + 138 * Math.sin((STOP_ANGLE * Math.PI) / 180)} ${150 - 138 * Math.cos((STOP_ANGLE * Math.PI) / 180)} L ${150 + 92 * Math.sin((STOP_ANGLE * Math.PI) / 180)} ${150 - 92 * Math.cos((STOP_ANGLE * Math.PI) / 180)}`} />
        <circle className="dial-center" cx="150" cy="150" r="60" />
      </svg>

      <div className="dial-label" role="status">
        <b>{copied && hovered === 0 ? 'Copied!' : (line?.label ?? 'Say hi')}</b>
        <small>{copied && hovered === 0 ? contact.email : (line?.detail ?? 'Pick a hole to dial')}</small>
      </div>

      {LINES.map(({ id, label, href, download }, i) => {
        const a = (ANGLES[i] * Math.PI) / 180
        const props = {
          className: 'dial-hole',
          'aria-label': label,
          style: { left: `${50 + (HOLE_RADIUS / 3) * Math.sin(a)}%`, top: `${50 - (HOLE_RADIUS / 3) * Math.cos(a)}%` },
          onPointerEnter: () => setHovered(i),
          onPointerLeave: () => setHovered(null),
          onFocus: () => setHovered(i),
          onBlur: () => setHovered(null),
        }
        return href ? (
          <a key={id} {...props} href={href} download={download} target={download ? undefined : '_blank'} rel="noopener" onClick={() => dial(i)} />
        ) : (
          <button
            key={id}
            {...props}
            type="button"
            onClick={() => {
              dial(i)
              onCopy()
            }}
          />
        )
      })}
    </div>
  )
}

export function Contact() {
  const askAbout = useCafe((s) => s.askAbout)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked: select the address, as v1 did, so it can be copied by hand
      const range = document.createRange()
      range.selectNodeContents(document.getElementById('contact-email')!)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }

  return (
    <>
      <RotaryDial onCopy={copy} copied={copied} />

      {askAbout && (
        <a className="ask" href={`mailto:${contact.email}?subject=${encodeURIComponent(`About ${askAbout.toLowerCase()}`)}`}>
          <small>You wanted to ask about</small>
          <b>{askAbout}</b>
          <span aria-hidden="true">Write to me →</span>
        </a>
      )}

      <div className="lines">
        <div className="line">
          <svg {...iconProps}>{LINES[0].icon}</svg>
          <span>Email</span>
          <code id="contact-email">{contact.email}</code>
          <button className={copied ? 'copy done' : 'copy'} type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {contact.links.map((link, i) => (
          <a className="line link" key={link.href} href={link.href} target="_blank" rel="noopener">
            <svg {...iconProps}>{LINES[i + 1].icon}</svg>
            <span>{link.label}</span>
            <em>{link.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</em>
            <i aria-hidden="true">↗</i>
          </a>
        ))}
        <div className="line">
          <svg {...iconProps}>
            <path d="M12 21c4.500-4.700 7-8.300 7-11.500a7 7 0 0 0-14 0C5 12.700 7.500 16.300 12 21z" />
            <circle cx="12" cy="9.500" r="2.300" />
          </svg>
          <span>Based in</span>
          <em>{contact.location}</em>
        </div>
      </div>
    </>
  )
}
