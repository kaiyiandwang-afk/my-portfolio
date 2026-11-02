import { useMemo } from 'react'
import { CatmullRomCurve3, CylinderGeometry, SphereGeometry, Vector3 } from 'three'
import { LAYOUT } from '../config'
import { chromeBands, dialTop, engravedRing, knurl, leatherette, lensGlass } from '../shaders/paintProps'
import { ribbonGeometry } from '../shaders/sculpt'
import { Cyl, Inked, Part, RoundBox, Surface } from './prims'

const CHROME = '#c9ced2'
const BLACK = '#1b1a1c'

/** The barrel's stepped rings, front to back along +Z. Cylinders here are rotated to lie along Z. */
const LYING = [Math.PI / 2, 0, 0] as const

/** A classic 35mm SLR: leatherette body, chrome plates, pentaprism, and a stepped 50mm lens. Lens faces +Z. */
function Body() {
  // the pentaprism hump, tapered with hard facets
  const prism = useMemo(() => {
    const g = new CylinderGeometry(0.0255, 0.043, 0.03, 4, 1)
    g.rotateY(Math.PI / 4)
    g.scale(1.06, 1, 0.82)
    const flat = g.toNonIndexed()
    flat.computeVertexNormals()
    return flat
  }, [])

  return (
    <>
      {/* base plate, leatherette, top plate */}
      <RoundBox size={[0.212, 0.008, 0.06]} radius={0.003} position={[0, 0.004, 0]} map={chromeBands()} gloss />
      <RoundBox size={[0.209, 0.069, 0.056]} radius={0.007} position={[0, 0.041, 0]} map={leatherette()} />
      <RoundBox size={[0.212, 0.027, 0.06]} radius={0.006} position={[0, 0.0885, 0]} map={chromeBands()} gloss />

      {/* pentaprism with a chrome hot shoe on top */}
      <Part geometry={prism} position={[0, 0.1165, 0.001]} color={BLACK} />
      <RoundBox size={[0.03, 0.004, 0.03]} radius={0.001} position={[0, 0.1335, 0.001]} map={chromeBands()} gloss noInk />

      {/* front details: self-timer lever and a small window */}
      <Cyl radius={0.0055} height={0.004} position={[-0.083, 0.078, 0.031]} rotation={LYING} color={CHROME} gloss noInk />
      <RoundBox size={[0.004, 0.02, 0.003]} radius={0.001} position={[-0.083, 0.066, 0.033]} color={CHROME} noInk />
      <RoundBox size={[0.018, 0.012, 0.002]} radius={0.001} position={[0.076, 0.088, 0.0305]} color="#28344a" gloss noInk />

      {/* strap lugs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.1085, 0.083, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.0062, 0.0014, 6, 14]} />
          <Surface color={CHROME} gloss />
        </mesh>
      ))}
    </>
  )
}

function TopControls() {
  return (
    <>
      {/* shutter speed dial */}
      <group position={[0.054, 0.102, 0.004]}>
        <Cyl radius={0.0175} height={0.01} segments={36} map={knurl('#383a3e', '#101012', 26)} noInk />
        <mesh position={[0, 0.0052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.0172, 32]} />
          <Surface map={dialTop()} />
        </mesh>
      </group>

      {/* shutter button in its threaded collar */}
      <Cyl radius={0.0063} height={0.005} position={[0.083, 0.1035, 0.012]} color={BLACK} noInk />
      <Cyl radius={0.0039} height={0.004} position={[0.083, 0.1075, 0.012]} color={CHROME} gloss noInk />

      {/* film advance lever: a pivot and a thin curved arm */}
      <Cyl radius={0.0085} height={0.006} position={[0.087, 0.1045, -0.013]} map={chromeBands()} gloss noInk />
      <RoundBox size={[0.05, 0.0032, 0.0068]} radius={0.0014} position={[0.069, 0.1085, -0.024]} rotation={[0, -0.42, 0]} color={BLACK} noInk />

      {/* rewind knob with its fold-out crank */}
      <group position={[-0.074, 0.1025, 0]}>
        <Cyl radius={0.0132} height={0.012} segments={28} map={knurl('#c4c9cd', '#6f767c', 22)} noInk />
        <Cyl radius={0.0132} height={0.0015} position={[0, 0.0065, 0]} segments={28} color={CHROME} gloss noInk />
        <RoundBox size={[0.024, 0.002, 0.006]} radius={0.0009} position={[0.007, 0.0082, 0]} color={CHROME} noInk />
        <Cyl radius={0.0024} height={0.005} position={[0.018, 0.0105, 0]} color={BLACK} noInk />
      </group>
    </>
  )
}

function Lens() {
  const apertures = engravedRing('aperture', ['16', '11', '8', '5.6', '4', '2.8', '1.8', '·', '16', '11', '8', '5.6', '4', '2.8', '1.8', '·'], '#1c1b1d', '#f0ece2')
  const focus = knurl('#2e2e31', '#0e0e10', 42)
  const filterRing = useMemo(() => new CylinderGeometry(0.0338, 0.0338, 0.0035, 40, 1, true), [])
  // Mapped straight-on rather than wrapped around the dome, so the coating's rings stay round.
  const glass = useMemo(() => {
    const radius = 0.0282
    const g = new SphereGeometry(radius, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const { position, uv } = g.attributes
    for (let i = 0; i < position.count; i++) {
      uv.setXY(i, (position.getX(i) / radius + 1) / 2, (position.getZ(i) / radius + 1) / 2)
    }
    return g
  }, [])
  return (
    <group position={[0, 0.0465, 0.028]}>
      {/* chrome mount */}
      <Cyl radius={0.0375} height={0.007} segments={40} position={[0, 0, 0.0035]} rotation={LYING} map={chromeBands()} gloss />
      {/* aperture ring */}
      <Cyl radius={0.0352} height={0.012} segments={40} position={[0, 0, 0.0125]} rotation={LYING} map={apertures} />
      {/* depth-of-field collar */}
      <Cyl radius={0.0335} height={0.006} segments={40} position={[0, 0, 0.0215]} rotation={LYING} color="#26262a" noInk />
      {/* rubber focus ring */}
      <Cyl radius={0.0368} height={0.019} segments={48} position={[0, 0, 0.0335]} rotation={LYING} map={focus} />
      {/* front barrel */}
      <Cyl top={0.0335} bottom={0.0318} height={0.012} segments={40} position={[0, 0, 0.049]} rotation={LYING} color={BLACK} gloss />
      {/* filter ring: open in the middle, so the glass sits down inside it */}
      <Part geometry={filterRing} position={[0, 0, 0.0565]} rotation={LYING} map={chromeBands()} doubleSided gloss noInk />
      <mesh position={[0, 0, 0.0584]}>
        <ringGeometry args={[0.0322, 0.0338, 40]} />
        <Surface color={CHROME} />
      </mesh>
      <mesh position={[0, 0, 0.0556]}>
        <ringGeometry args={[0.0278, 0.0332, 40]} />
        <Surface color="#121113" />
      </mesh>
      {/* the coated glass, slightly domed */}
      <mesh geometry={glass} position={[0, 0, 0.0555]} scale={[1, 1, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <Surface map={lensGlass()} />
      </mesh>
    </group>
  )
}

/** A leather strap, clipped to both lugs, with the loop lying on the counter in front of the lens. */
function Strap() {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(-0.112, 0.08, 0),
      new Vector3(-0.13, 0.05, -0.012),
      new Vector3(-0.147, 0.008, 0.002),
      new Vector3(-0.158, 0.004, 0.08),
      new Vector3(-0.09, 0.004, 0.156),
      new Vector3(0.04, 0.004, 0.17),
      new Vector3(0.15, 0.004, 0.116),
      new Vector3(0.158, 0.006, 0.03),
      new Vector3(0.13, 0.05, -0.012),
      new Vector3(0.112, 0.08, 0),
    ])
    return ribbonGeometry(curve, 0.014, 90)
  }, [])
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <Surface color="#6e4326" doubleSided />
    </mesh>
  )
}

export function FilmCamera() {
  const { position, rotationY } = LAYOUT.filmCamera
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Inked>
        <Body />
        <TopControls />
        <Lens />
      </Inked>
      <Strap />
    </group>
  )
}
