import { useEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { LAYOUT, PALETTE } from '../config'
import { resume, sections } from '../content'
import { useCafe } from '../state/store'
import { goToSection } from '../ui/ExploreMenu'
import { useIsPhone } from '../ui/useIsPhone'
import { Box, Inked, Surface, makeCanvasTexture } from './prims'

const BOARD = { width: 1.72, height: 1.22 }
const PIXELS = { width: 860, height: 610 }
const FIRST_ROW = 132
const ROW = 41

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

/**
 * The menu is painted onto the board. At the close-up, invisible buttons land exactly on each painted row, so the board
 * itself is what you click, and keyboards and screen readers get a real list.
 */
function BoardButtons() {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => first.current?.focus({ preventScroll: true }), [])
  return (
    <Html transform distanceFactor={0.8} position={[0, 0, 0.046]} zIndexRange={[5, 1]}>
      <nav className="chalk" aria-label="Menu" onPointerDown={stop} onPointerUp={stop} onClick={stop}>
        {sections.map(({ id, title, object }, i) => (
          <button key={id} ref={i === 0 ? first : undefined} type="button" style={{ top: FIRST_ROW + i * ROW - 31 }} onClick={() => goToSection(id)}>
            {title}, {object}
          </button>
        ))}
        <a href={resume.href} download={resume.filename} style={{ top: FIRST_ROW + sections.length * ROW - 31 }}>
          {resume.label}, download PDF
        </a>
      </nav>
    </Html>
  )
}

/** The Explore menu as a café menu, drawn straight from content.ts. */
export function Chalkboard() {
  const atBoard = useCafe((s) => s.focus === 'chalkboard' && s.cameraState === 'focused')
  const phone = useIsPhone()
  const texture = useMemo(
    () =>
      makeCanvasTexture(
        PIXELS.width,
        PIXELS.height,
        (ctx, w) => {
          ctx.fillStyle = PALETTE.chalkboard
          ctx.fillRect(0, 0, w, PIXELS.height)
          ctx.fillStyle = '#f4efe2'
          ctx.textAlign = 'center'
          ctx.font = '700 54px Sora, system-ui, sans-serif'
          ctx.fillText('Menu', w / 2, 74)
          ctx.font = '600 29px "Nunito Sans", system-ui, sans-serif'
          const rows = [...sections.map(({ title, object }) => [title, object.replace(/^The /, '')]), [resume.label, 'download']]
          rows.forEach(([title, object], i) => {
            const y = FIRST_ROW + i * ROW
            ctx.textAlign = 'left'
            ctx.fillStyle = '#f4efe2'
            ctx.fillText(title, 60, y)
            ctx.textAlign = 'right'
            ctx.fillStyle = '#ffb86b'
            ctx.fillText(object, w - 60, y)
          })
        },
        ['700 54px Sora', '600 29px "Nunito Sans"'],
      ),
    [],
  )

  return (
    <group position={LAYOUT.chalkboard.position}>
      <Inked>
        <Box size={[BOARD.width + 0.09, BOARD.height + 0.09, 0.04]} position={[0, 0, 0.02]} color={PALETTE.woodDark} />
      </Inked>
      <mesh position={[0, 0, 0.042]} receiveShadow>
        <planeGeometry args={[BOARD.width, BOARD.height]} />
        <Surface map={texture} />
      </mesh>
      {atBoard && !phone && <BoardButtons />}
    </group>
  )
}
