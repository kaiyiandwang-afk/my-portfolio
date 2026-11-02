import type { PointerEvent } from 'react'
import { art } from '../../content'
import { useCafe } from '../../state/store'

/** Each frame leans toward the pointer, as if you'd stepped up to the wall. */
function tilt(event: PointerEvent<HTMLButtonElement>) {
  const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
  event.currentTarget.style.setProperty('--rx', `${(0.5 - (event.clientY - top) / height) * 11}deg`)
  event.currentTarget.style.setProperty('--ry', `${((event.clientX - left) / width - 0.5) * 11}deg`)
}

function untilt(event: PointerEvent<HTMLButtonElement>) {
  event.currentTarget.style.removeProperty('--rx')
  event.currentTarget.style.removeProperty('--ry')
}

export function ArtGallery() {
  const openLightbox = useCafe((s) => s.openLightbox)
  return (
    <>
      <div className="gallery">
        {art.images.map((image, i) => (
          <button
            key={image.src}
            type="button"
            aria-label={`Enlarge ${image.title ?? image.alt}`}
            style={{ '--n': i } as React.CSSProperties}
            onPointerMove={tilt}
            onPointerLeave={untilt}
            onClick={() => openLightbox(art.images, i)}
          >
            <span className="mat">
              <img src={image.src} alt={image.alt} loading="lazy" />
            </span>
            <small>{image.title}</small>
          </button>
        ))}
      </div>
      <a className="btn-solid wide" href={art.instagram.href} target="_blank" rel="noopener">
        {art.instagram.label} <span aria-hidden="true">↗</span>
      </a>
    </>
  )
}
