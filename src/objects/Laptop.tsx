import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { ExtrudeGeometry, Shape, ShapeGeometry } from 'three'
import type { BufferGeometry } from 'three'
import { LAYOUT } from '../config'
import { LAPTOP, paintKeyboardDeck, paintLaptopScreen } from '../shaders/paintLaptop'
import { useCafe } from '../state/store'
import { Desktop } from '../ui/Desktop'
import { useIsPhone } from '../ui/useIsPhone'
import { Cyl, Inked, Part } from './prims'

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

const SILVER = '#d9dbde'
const SCREEN_TILT = -0.28
const BEVEL = 0.0016

function roundedShape(width: number, height: number, radius: number) {
  const x = width / 2
  const y = height / 2
  const shape = new Shape()
  shape.moveTo(-x + radius, -y)
  shape.lineTo(x - radius, -y)
  shape.absarc(x - radius, -y + radius, radius, -Math.PI / 2, 0, false)
  shape.lineTo(x, y - radius)
  shape.absarc(x - radius, y - radius, radius, 0, Math.PI / 2, false)
  shape.lineTo(-x + radius, y)
  shape.absarc(-x + radius, y - radius, radius, Math.PI / 2, Math.PI, false)
  shape.lineTo(-x, -y + radius)
  shape.absarc(-x + radius, -y + radius, radius, Math.PI, Math.PI * 1.5, false)
  return shape
}

/** A thin aluminium slab: rounded corners in plan, softly eased edges, centered on the origin in x and y. */
function slab(width: number, height: number, thickness: number, radius: number) {
  const geometry = new ExtrudeGeometry(roundedShape(width - BEVEL * 2, height - BEVEL * 2, radius - BEVEL), {
    depth: thickness - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
    curveSegments: 10,
  })
  geometry.translate(0, 0, BEVEL)
  return geometry
}

/** A flat rounded panel whose UVs cover its bounds, for painted surfaces. */
function panel(width: number, height: number, radius: number): BufferGeometry {
  const geometry = new ShapeGeometry(roundedShape(width, height, radius), 10)
  const { position, uv } = geometry.attributes
  for (let i = 0; i < position.count; i++) uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5)
  return geometry
}

/**
 * A 13" MacBook Air: the flat, even slab with thin black bezels and a notch, a little over life size to suit the café's
 * proportions. Faces local +Z. The tiny desktop only mounts at the close-up, so the rest of the time it costs nothing.
 * Phones get the projects in the bottom sheet instead, since this much UI on a laptop screen would be unreadable there.
 */
export function Laptop() {
  const { position, rotationY } = LAYOUT.laptop
  const projectsOpen = useCafe((s) => s.openSection === 'projects')
  const phone = useIsPhone()
  const { width, depth, baseHeight, lidThickness, corner, screen } = LAPTOP

  const parts = useMemo(
    () => ({
      base: slab(width, depth, baseHeight, corner),
      lid: slab(width, depth, lidThickness, corner),
      deck: panel(width - 0.006, depth - 0.006, corner - 0.003),
      bezel: panel(width - 0.0035, depth - 0.0035, corner - 0.0018),
      deckMap: paintKeyboardDeck(),
      screenMap: paintLaptopScreen(),
    }),
    [width, depth, baseHeight, lidThickness, corner],
  )

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Inked>
        {/* the base lies flat: its extrusion runs along local Z, so it's turned up onto the counter */}
        <Part geometry={parts.base} rotation={[-Math.PI / 2, 0, 0]} color={SILVER} gloss />
      </Inked>
      <Part geometry={parts.deck} map={parts.deckMap} rotation={[-Math.PI / 2, 0, 0]} position={[0, baseHeight + 0.0003, 0]} noCast noInk />

      {/* the hinge, tucked between the two halves */}
      <Cyl radius={0.0042} height={width * 0.86} rotation={[0, 0, Math.PI / 2]} position={[0, baseHeight, -depth / 2 + 0.005]} color="#2b2c30" noInk />

      <group position={[0, baseHeight, -depth / 2 + 0.004]} rotation={[SCREEN_TILT, 0, 0]}>
        <group position={[0, depth / 2, 0]}>
          <Inked>
            <Part geometry={parts.lid} position={[0, 0, -lidThickness]} color={SILVER} gloss />
          </Inked>
          <Part geometry={parts.bezel} position={[0, 0, 0.0005]} color="#08090b" gloss noCast noInk />
        </group>
        <mesh position={[0, screen.centerY, 0.001]}>
          <planeGeometry args={[screen.width, screen.height]} />
          {/* lit from within, so the screen holds its colors in the sun */}
          <meshBasicMaterial map={parts.screenMap} />
        </mesh>
        {projectsOpen && !phone && (
          // 980 by 634 layout pixels, scaled to fit the screen: one pixel is distanceFactor / 400 meters
          <Html transform distanceFactor={(screen.width / 980) * 400} position={[0, screen.centerY, 0.0016]} zIndexRange={[5, 1]}>
            {/* keeps clicks on the desktop from reaching the canvas, which would read as clicking away */}
            <div onPointerDown={stop} onPointerUp={stop} onClick={stop} onWheel={stop}>
              <Desktop />
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}
