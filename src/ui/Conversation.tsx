import { useEffect, useRef, useState } from 'react'
import { about, dialogue, site } from '../content'
import type { DialogueReply } from '../content'
import { useCafe } from '../state/store'
import { goToSection } from './ExploreMenu'

const CHARACTER_MS = 18
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Types text out character by character. Screen readers get the whole line at once through the status region. */
function useTypewriter(text: string) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (reducedMotion()) {
      setCount(text.length)
      return
    }
    setCount(0)
    const ticker = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) window.clearInterval(ticker)
        return current + 1
      })
    }, CHARACTER_MS)
    return () => window.clearInterval(ticker)
  }, [text])
  return { typed: text.slice(0, count), finish: () => setCount(text.length) }
}

/** Kaiyi's About section: a conversation beside her, with replies built from content.ts. Clicking her cycles v1's lines. */
export function Conversation() {
  const openSection = useCafe((s) => s.openSection)
  const kaiyiLine = useCafe((s) => s.kaiyiLine)
  const [nodeId, setNodeId] = useState('hello')
  const panel = useRef<HTMLDivElement>(null)
  const open = openSection === 'about'

  useEffect(() => {
    if (open) {
      setNodeId('hello')
      panel.current?.querySelector('button')?.focus({ preventScroll: true })
    }
  }, [open])

  const node = dialogue.find(({ id }) => id === nodeId) ?? dialogue[0]
  // A click on Kaiyi interrupts with one of her lines; choosing a reply clears it.
  const text = kaiyiLine?.text ?? node.text
  const { typed, finish } = useTypewriter(open ? text : '')
  if (!open) return null

  const choose = (reply: DialogueReply) => {
    useCafe.setState({ kaiyiLine: null })
    if (reply.to) setNodeId(reply.to)
    if (reply.open) goToSection(reply.open)
  }

  return (
    <div className="conversation" ref={panel}>
      <header className="conv-head">
        <span className="av" aria-hidden="true">
          K
        </span>
        <div>
          <b>{site.name}</b>
          <small>{site.badge.subtitle}</small>
        </div>
      </header>
      <p className="sr-only" role="status">
        {text}
      </p>
      {/* clicking the line finishes it, for anyone who reads faster than she types */}
      <p className="spoken" aria-hidden="true" onClick={finish}>
        {typed}
        {typed.length < text.length && <span className="caret" />}
      </p>
      <div className="replies" key={kaiyiLine ? 'line' : nodeId}>
        {node.replies.map((reply, i) => {
          const props = { style: { '--n': i } as React.CSSProperties, onClick: () => choose(reply) }
          const mark = reply.href ? '↓' : reply.open ? '→' : null
          return reply.href ? (
            <a key={reply.label} {...props} href={reply.href} download>
              {reply.label}
              {mark && <i aria-hidden="true">{mark}</i>}
            </a>
          ) : (
            <button key={reply.label} {...props} type="button">
              {reply.label}
              {mark && <i aria-hidden="true">{mark}</i>}
            </button>
          )
        })}
      </div>
      <dl className="conv-stats">
        {about.stats.map(({ value, label }) => (
          <div key={label}>
            <dt>{value}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
