import { useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { cats } from '../../content'
import { useCafe } from '../../state/store'

interface Spot {
  x: number
  y: number
  tilt: number
  z: number
}

const CLICK_TOLERANCE = 5

function scatter(count: number): Spot[] {
  return Array.from({ length: count }, (_, i) => ({
    // loosely in two columns, then thrown
    x: (i % 2 === 0 ? 3 : 50) + Math.random() * 8,
    y: 2 + Math.floor(i / 2) * 28 + Math.random() * 5,
    tilt: (Math.random() - 0.5) * 16,
    z: i + 1,
  }))
}

/** A pile of photos on the table. Drag them around, click one to look closer, or toss them all again. */
export function Polaroids() {
  const openLightbox = useCafe((s) => s.openLightbox)
  const [spots, setSpots] = useState(() => scatter(cats.images.length))
  const [dragging, setDragging] = useState<number | null>(null)
  const table = useRef<HTMLDivElement>(null)
  const top = useRef(cats.images.length)
  const gesture = useRef({ x: 0, y: 0, startX: 0, startY: 0, moved: false })
  const images = useMemo(() => cats.images, [])

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, i: number) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false }
    top.current += 1
    const z = top.current
    setDragging(i)
    setSpots((list) => list.map((spot, n) => (n === i ? { ...spot, z } : spot)))
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>, i: number) => {
    if (dragging !== i || !table.current) return
    const { width, height } = table.current.getBoundingClientRect()
    const dx = ((event.clientX - gesture.current.x) / width) * 100
    const dy = ((event.clientY - gesture.current.y) / height) * 100
    gesture.current.x = event.clientX
    gesture.current.y = event.clientY
    if (Math.hypot(event.clientX - gesture.current.startX, event.clientY - gesture.current.startY) > CLICK_TOLERANCE) gesture.current.moved = true
    setSpots((list) =>
      list.map((spot, n) => (n === i ? { ...spot, x: Math.min(58, Math.max(-6, spot.x + dx)), y: Math.min(78, Math.max(-3, spot.y + dy)), tilt: spot.tilt + dx * 0.25 } : spot)),
    )
  }

  const onPointerUp = (i: number) => {
    setDragging(null)
    if (!gesture.current.moved) openLightbox(images, i)
  }

  return (
    <>
      <div className="table" ref={table}>
        {images.map((image, i) => {
          const { x, y, tilt, z } = spots[i]
          return (
            <button
              key={image.src}
              type="button"
              className={dragging === i ? 'polaroid held' : 'polaroid'}
              aria-label={`Enlarge ${image.caption ?? image.alt}`}
              style={{ left: `${x}%`, top: `${y}%`, zIndex: z, '--tilt': `${tilt}deg`, '--n': i } as React.CSSProperties}
              onPointerDown={(event) => onPointerDown(event, i)}
              onPointerMove={(event) => onPointerMove(event, i)}
              onPointerUp={() => onPointerUp(i)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') openLightbox(images, i)
              }}
            >
              <img src={image.src} alt={image.alt} draggable={false} />
              <span>{image.caption}</span>
            </button>
          )
        })}
        <div className="table-note">
          <span>Drag them around, or click one to look closer.</span>
          <button type="button" className="btn-ghost" onClick={() => setSpots(scatter(images.length))}>
            Toss again
          </button>
        </div>
      </div>
    </>
  )
}
