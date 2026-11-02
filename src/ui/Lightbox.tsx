import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useCafe } from '../state/store'

/** The enlarged image, on a paper-textured mat. Click it to look closer and move across it; the strip below jumps around. */
export function Lightbox() {
  const lightbox = useCafe((s) => s.lightbox)
  const closeLightbox = useCafe((s) => s.closeLightbox)
  const stepLightbox = useCafe((s) => s.stepLightbox)
  const closeButton = useRef<HTMLButtonElement>(null)
  const isOpen = lightbox !== null
  const [zoomed, setZoomed] = useState(false)
  const index = lightbox?.index

  useEffect(() => setZoomed(false), [index])

  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement as HTMLElement
    closeButton.current?.focus()
    return () => previous?.focus?.()
  }, [isOpen])

  if (!lightbox) return null
  const image = lightbox.images[lightbox.index]
  const label = image.title ?? image.caption

  const pan = (event: MouseEvent<HTMLElement>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--ox', `${((event.clientX - left) / width) * 100}%`)
    event.currentTarget.style.setProperty('--oy', `${((event.clientY - top) / height) * 100}%`)
  }

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label ?? image.alt}
      onClick={closeLightbox}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') stepLightbox(1)
        if (event.key === 'ArrowLeft') stepLightbox(-1)
        if (event.key === 'Tab') {
          const items = event.currentTarget.querySelectorAll<HTMLElement>('button')
          const first = items[0]
          const last = items[items.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
      }}
    >
      <figure key={image.src} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={zoomed ? 'zoom in' : 'zoom'} aria-label={zoomed ? 'Zoom out' : 'Zoom in'} aria-pressed={zoomed} onPointerMove={pan} onClick={(event) => {
          pan(event)
          setZoomed(!zoomed)
        }}>
          <img src={image.src} alt={image.alt} />
        </button>
        {label && <figcaption>{label}</figcaption>}
      </figure>
      <div className="lightbox-strip" onClick={(event) => event.stopPropagation()}>
        {lightbox.images.map((thumb, i) => (
          <button
            key={thumb.src}
            type="button"
            aria-label={`Image ${i + 1}`}
            aria-current={i === lightbox.index ? 'true' : undefined}
            onClick={() => stepLightbox(i - lightbox.index)}
          >
            <img src={thumb.src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="lightbox-controls" onClick={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Previous image" onClick={() => stepLightbox(-1)}>
          ←
        </button>
        <span>
          {lightbox.index + 1} / {lightbox.images.length}
        </span>
        <button type="button" aria-label="Next image" onClick={() => stepLightbox(1)}>
          →
        </button>
        <button ref={closeButton} type="button" aria-label="Close image" onClick={closeLightbox}>
          ×
        </button>
      </div>
    </div>
  )
}
