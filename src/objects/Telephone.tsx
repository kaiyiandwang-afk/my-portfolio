import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import type { Group } from 'three'
import { useCafe } from '../state/store'
import { CatmullRomCurve3, Curve, CylinderGeometry, DoubleSide, ExtrudeGeometry, LatheGeometry, Path, Shape, TubeGeometry, Vector2, Vector3 } from 'three'
import { LAYOUT } from '../config'
import { chromeBands, dialPlate } from '../shaders/paintProps'
import { capsule, ellipsoid, roundBox, sculptGeometry, smax, smin } from '../shaders/sculpt'
import { Cyl, Inked, Limb, Part, Surface } from './prims'

const BAKELITE = '#a3211c'
const BAKELITE_DARK = '#7d1713'
const CORD = '#6e1612'

/** Body sculpted like a 1950s desk phone: a rounded base, a sloped dial face, and two cradle towers. Front is +Z. */
function bodyField(x: number, y: number, z: number) {
  let d = roundBox(x, y - 0.03, z, 0.104, 0.03, 0.1, 0.022)
  d = smin(d, ellipsoid(x, y, z, 0, 0.052, -0.02, 0.1, 0.066, 0.086), 0.035)
  // the sloped front the dial sits on
  d = smax(d, (y - 0.112) * 0.82 + (z - 0.02) * 0.57, 0.018)
  for (const s of [-1, 1]) {
    d = smin(d, capsule(x, y, z, s * 0.058, 0.085, -0.03, s * 0.074, 0.122, -0.03, 0.0135), 0.024)
  }
  return smax(d, -y, 0.005)
}

const HOLE_COUNT = 10
const HOLE_ORBIT = 0.0355
const HOLE_RADIUS = 0.0084
const PLATE_RADIUS = 0.056
const WHEEL_RADIUS = 0.051

// Digit 1 sits at the top right, running counterclockwise, with a gap by the finger stop, like the real thing.
const HOLE_ANGLES = Array.from({ length: HOLE_COUNT }, (_, i) => ((58 + i * 30.2) * Math.PI) / 180)

/** The finger wheel as real geometry, with holes you can see through to the digits beneath. */
function wheelGeometry() {
  const shape = new Shape()
  shape.absarc(0, 0, WHEEL_RADIUS, 0, Math.PI * 2, false)
  HOLE_ANGLES.forEach((a) => {
    const hole = new Path()
    hole.absarc(Math.cos(a) * HOLE_ORBIT, Math.sin(a) * HOLE_ORBIT, HOLE_RADIUS, 0, Math.PI * 2, true)
    shape.holes.push(hole)
  })
  const center = new Path()
  center.absarc(0, 0, 0.0165, 0, Math.PI * 2, true)
  shape.holes.push(center)
  const geometry = new ExtrudeGeometry(shape, { depth: 0.0048, bevelEnabled: true, bevelThickness: 0.0009, bevelSize: 0.0009, bevelSegments: 2, curveSegments: 28 })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

function Dial() {
  const wheel = useMemo(wheelGeometry, [])
  const plate = useMemo(() => dialPlate(HOLE_ANGLES, HOLE_ORBIT, PLATE_RADIUS), [])
  return (
    // sits on the sloped face, tilted to match its normal
    <group position={[0, 0.0945, 0.048]} rotation={[0.607, 0, 0]}>
      <Cyl radius={PLATE_RADIUS} height={0.004} segments={40} position={[0, 0.001, 0]} map={chromeBands()} gloss noInk />
      <mesh position={[0, 0.0034, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[PLATE_RADIUS - 0.002, 48]} />
        <Surface map={plate} />
      </mesh>
      <Part geometry={wheel} position={[0, 0.0048, 0]} color="#d3d7d9" gloss noCast noInk />
      {/* the finger stop */}
      <Limb from={[0.052, 0.012, 0.016]} to={[0.04, 0.017, 0.012]} radius={0.0022} color="#c6cbce" />
    </group>
  )
}

/** The handset's ear and mouth cups, turned on a lathe with a rolled lip. */
function cupGeometry() {
  const profile = [
    [0.0, 0.0],
    [0.024, 0.0],
    [0.031, 0.003],
    [0.0332, 0.009],
    [0.031, 0.017],
    [0.024, 0.026],
    [0.0155, 0.033],
  ].map(([x, y]) => new Vector2(x, y))
  return new LatheGeometry(profile, 28)
}

/** The curved grip between the cups, slightly flattened like a real handset. */
function gripGeometry() {
  const curve = new CatmullRomCurve3([
    new Vector3(-0.112, 0.012, 0),
    new Vector3(-0.07, 0.024, 0),
    new Vector3(0, 0.03, 0),
    new Vector3(0.07, 0.024, 0),
    new Vector3(0.112, 0.012, 0),
  ])
  const geometry = new TubeGeometry(curve, 36, 0.0138, 14)
  geometry.scale(1, 0.92, 1.12)
  return geometry
}

const RING_SECONDS = 1.1

function Handset() {
  const cup = useMemo(cupGeometry, [])
  const grip = useMemo(gripGeometry, [])
  const receiver = useRef<Group>(null)
  // It rattles on the cradle while ringing, then lifts off.
  const ringing = useRef(0)
  useFrame((_, delta) => {
    if (!receiver.current) return
    const open = useCafe.getState().openSection === 'contact'
    ringing.current = open ? ringing.current + delta : 0
    const lifted = open && ringing.current > RING_SECONDS
    const rattle = open && !lifted ? Math.sin(ringing.current * 70) * 0.012 : 0
    receiver.current.rotation.z = rattle + (lifted ? -0.18 : 0)
    easing.damp(receiver.current.position, 'y', lifted ? 0.2 : 0.136, 0.14, delta)
    easing.damp(receiver.current.rotation, 'x', lifted ? 0.26 : 0, 0.14, delta)
  })
  return (
    <group ref={receiver} name="receiver" position={[0, 0.136, -0.03]}>
      <Part geometry={grip} color={BAKELITE} gloss />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.112, -0.024, 0]}>
          <Part geometry={cup} color={BAKELITE} gloss />
          <mesh position={[0, -0.0004, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.022, 24]} />
            <meshBasicMaterial color={BAKELITE_DARK} side={DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Wraps a helix around any path: this is what makes the cord read as a real coiled phone cord. */
class CoiledCord extends Curve<Vector3> {
  private path: Curve<Vector3>
  private radius: number
  private turns: number

  constructor(path: Curve<Vector3>, radius: number, turns: number) {
    super()
    this.path = path
    this.radius = radius
    this.turns = turns
  }

  override getPoint(t: number, target = new Vector3()) {
    const base = this.path.getPoint(t)
    const tangent = this.path.getTangent(t)
    const side = new Vector3(0, 1, 0).cross(tangent).normalize()
    const up = tangent.clone().cross(side).normalize()
    const a = t * this.turns * Math.PI * 2
    return target
      .copy(base)
      .addScaledVector(side, Math.cos(a) * this.radius)
      .addScaledVector(up, Math.sin(a) * this.radius)
  }
}

function Cord() {
  const geometry = useMemo(() => {
    // leaves the handset's end, drops to the counter, wanders, and climbs back into the body
    const path = new CatmullRomCurve3([
      new Vector3(0.138, 0.112, -0.03),
      new Vector3(0.168, 0.05, -0.022),
      new Vector3(0.186, 0.012, 0.03),
      new Vector3(0.214, 0.009, 0.092),
      new Vector3(0.262, 0.009, 0.05),
      new Vector3(0.246, 0.009, -0.05),
      new Vector3(0.19, 0.009, -0.112),
      new Vector3(0.112, 0.012, -0.112),
      new Vector3(0.066, 0.024, -0.095),
    ])
    return new TubeGeometry(new CoiledCord(path, 0.0062, 54), 480, 0.0018, 5)
  }, [])
  return <Part geometry={geometry} color={CORD} noInk />
}

export function Telephone() {
  const { position, rotationY } = LAYOUT.telephone
  const body = useMemo(
    () => sculptGeometry(bodyField, { center: [0, 0.05, 0], reach: 0.22, axis: 'y', around: 84, along: 60 }),
    [],
  )
  const prong = useMemo(() => new CylinderGeometry(0.0034, 0.0044, 0.022, 10), [])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Inked>
        <Part geometry={body} color={BAKELITE} gloss />
        {/* cradle prongs hold the handset between them */}
        {[-1, 1].map((s) =>
          [-1, 1].map((f) => (
            <Part key={`${s}${f}`} geometry={prong} position={[s * 0.075, 0.139, -0.03 + f * 0.02]} rotation={[f * 0.32, 0, 0]} color={BAKELITE_DARK} noInk />
          )),
        )}
        <Dial />
        <Handset />
      </Inked>
      <Cord />
    </group>
  )
}
