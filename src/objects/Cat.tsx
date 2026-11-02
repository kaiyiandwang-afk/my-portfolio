import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { BufferGeometry, Euler, Float32BufferAttribute, LatheGeometry, MathUtils, Matrix4, MeshBasicMaterial, Quaternion, QuadraticBezierCurve3, SphereGeometry, TubeGeometry, Vector2, Vector3 } from 'three'
import type { Group, InstancedMesh, MeshToonMaterial, Sprite } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CAT, LAYOUT } from '../config'
import type { Vec3 } from '../config'
import { furMaterial } from '../shaders/fur'
import type { FurOptions } from '../shaders/fur'
import { ellipsoid, sculptGeometry, smax, smin } from '../shaders/sculpt'
import { setPurr } from '../audio/mixer'
import { dusk } from '../state/dayNight'
import { useCafe } from '../state/store'
import { cat, CAT_STRIDE, tickCat } from './catBrain'
import type { CatPose } from './catBrain'
import { makeCanvasTexture, Part, Sph, Surface, Torus } from './prims'

/**
 * A tabby, rigged by hand. Local +Z is forward and the surface it's on is at y = 0. The torso moves as one piece and each
 * leg is solved so its paw lands where the gait wants it. catBrain.ts decides what it's doing; this file makes it look so.
 */

function bodyField(x: number, y: number, z: number) {
  let d = ellipsoid(x, y, z, 0, 0.118, -0.04, 0.09, 0.09, 0.215) // barrel of the torso, slim and long
  d = smin(d, ellipsoid(x, y, z, 0, 0.122, 0.108, 0.066, 0.086, 0.09), 0.05) // chest
  d = smin(d, ellipsoid(x, y, z, 0, 0.162, 0.05, 0.06, 0.05, 0.1), 0.05) // shoulder blades
  d = smin(d, ellipsoid(x, y, z, 0, 0.124, -0.205, 0.086, 0.09, 0.08), 0.05) // rump
  for (const s of [-1, 1]) {
    d = smin(d, ellipsoid(x, y, z, s * 0.07, 0.1, -0.16, 0.044, 0.066, 0.086), 0.04) // haunch
  }
  return d
}

function headField(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  let d = ellipsoid(x, y, z, 0, 0.014, -0.008, 0.08, 0.07, 0.078) // cranium
  d = smin(d, ellipsoid(ax, y, z, 0.05, -0.018, 0.008, 0.05, 0.042, 0.05), 0.03) // cheek
  d = smin(d, ellipsoid(x, y, z, 0, -0.004, 0.066, 0.017, 0.022, 0.024), 0.02) // bridge of the nose
  d = smin(d, ellipsoid(ax, y, z, 0.019, -0.03, 0.066, 0.025, 0.019, 0.022), 0.012) // whisker pad
  d = smin(d, ellipsoid(x, y, z, 0, -0.05, 0.056, 0.02, 0.016, 0.019), 0.012) // chin
  d = smin(d, ellipsoid(ax, y, z, 0.034, 0.03, 0.054, 0.026, 0.012, 0.016), 0.014) // brow
  // eye sockets, carved out so the eyes sit in the skull rather than on it
  d = smax(d, -ellipsoid(ax, y, z, 0.036, 0.004, 0.078, 0.021, 0.016, 0.02), 0.007)
  return d
}

/** A half-cone ear, open at the front. */
function earGeometry(radius: number, height: number) {
  const rows = 12
  const cols = 14
  const positions: number[] = []
  const indices: number[] = []
  for (let j = 0; j <= rows; j++) {
    const t = j / rows
    const r = radius * Math.pow(1 - t, 0.82) + 0.0012
    for (let i = 0; i <= cols; i++) {
      const a = (i / cols - 0.5) * 2.5
      positions.push(Math.sin(a) * r, height * t, -Math.cos(a) * r * 0.62)
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const p = j * (cols + 1) + i
      indices.push(p, p + cols + 1, p + 1, p + 1, p + cols + 1, p + cols + 2)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/** A straight tube whose z runs 0 to 1. The fur shader bends it along the tail's curve. */
function tailGeometry() {
  const rings = 44
  const sides = 12
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (let j = 0; j <= rings; j++) {
    const t = j / rings
    const r = (0.027 - 0.008 * t) * Math.min(1, Math.sqrt((1 - t) * 18 + 0.02))
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2
      positions.push(Math.cos(a) * r, Math.sin(a) * r, t)
      normals.push(Math.cos(a), Math.sin(a), 0)
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < sides; i++) {
      const p = j * (sides + 1) + i
      const q = p + sides + 1
      indices.push(p, p + 1, q, p + 1, q + 1, q)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  return geometry
}

const shadowOnly = new MeshBasicMaterial({ colorWrite: false, depthWrite: false })
const identity = new Matrix4()

/** One draw call holding every fur shell. */
function FurShells({
  geometry,
  options,
  castShadow = true,
  shells = CAT.shells,
}: {
  geometry: BufferGeometry
  options: Omit<FurOptions, 'shells' | 'base' | 'dark' | 'cream'>
  castShadow?: boolean
  shells?: number
}) {
  const ref = useRef<InstancedMesh>(null)
  const material = useMemo<MeshToonMaterial>(
    () => furMaterial({ ...options, shells, base: CAT.base, dark: CAT.dark, cream: CAT.cream }),
    [options, shells],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    for (let i = 0; i < shells; i++) mesh.setMatrixAt(i, identity)
    mesh.instanceMatrix.needsUpdate = true
  }, [shells])

  return (
    <>
      <instancedMesh ref={ref} args={[geometry, material, shells]} receiveShadow frustumCulled={false} userData={{ noOutline: true }} />
      {castShadow && <mesh geometry={geometry} material={shadowOnly} castShadow />}
    </>
  )
}

function irisTexture() {
  return makeCanvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2e8d4'
    ctx.fillRect(0, 0, w, h)
    const cx = w / 2
    const cy = h / 2
    // a sphere's texture is twice as wide as tall, so a round iris needs squashing in texture space
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 2)
    const r = 82
    const iris = ctx.createRadialGradient(0, 0, 8, 0, 0, r)
    iris.addColorStop(0, CAT.iris.inner)
    iris.addColorStop(0.55, CAT.iris.outer)
    iris.addColorStop(0.9, '#8f5a1c')
    iris.addColorStop(1, '#2a1a10')
    ctx.fillStyle = iris
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, 7)
    ctx.fill()
    // radial fibres
    ctx.strokeStyle = 'rgba(70,40,10,.3)'
    ctx.lineWidth = 1.4
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16)
      ctx.lineTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6))
      ctx.stroke()
    }
    // the slit pupil: narrow in golden-hour light
    ctx.fillStyle = '#0b0705'
    ctx.beginPath()
    ctx.ellipse(0, 0, 25, r - 7, 0, 0, 7)
    ctx.fill()
    // catchlights
    ctx.fillStyle = 'rgba(255,255,255,.96)'
    ctx.beginPath()
    ctx.ellipse(-26, -30, 14, 16, 0, 0, 7)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    ctx.beginPath()
    ctx.ellipse(26, 26, 7, 8, 0, 0, 7)
    ctx.fill()
    ctx.restore()
  })
}

const EYE_RADIUS = 0.0172

const LID_OPEN = -0.7
const LID_SHUT = 0.74

/** The eye plus both lids. Blinks by rotating the upper lid forward. */
function Eye({ side, lid }: { side: -1 | 1; lid: (group: Group | null) => void }) {
  const geometry = useMemo(() => new SphereGeometry(EYE_RADIUS, 24, 18), [])
  const lidGeometry = useMemo(() => new SphereGeometry(EYE_RADIUS * 1.09, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), [])
  const texture = useMemo(irisTexture, [])
  return (
    <group position={[side * 0.036, 0.004, 0.0585]} rotation={[0, side * 0.2, 0]}>
      {/* unlit, so the eyes stay bright even in the cat's own shadow */}
      <mesh geometry={geometry} rotation={[0, -Math.PI / 2, 0]}>
        <meshBasicMaterial map={texture} color={[0.84, 0.84, 0.84]} />
      </mesh>
      {/* outer corners lift, giving the almond shape */}
      <group rotation={[0, 0, side * 0.16]}>
        <group ref={lid} rotation={[LID_OPEN, 0, 0]}>
          <mesh geometry={lidGeometry}>
            <Surface color={CAT.base} />
          </mesh>
          <Torus radius={EYE_RADIUS * 1.09} tube={0.00075} rotation={[Math.PI / 2, 0, 0]} color="#3a2416" noCast noInk />
        </group>
        <group name="lowerLid" rotation={[Math.PI + 0.74, 0, 0]}>
          <mesh geometry={lidGeometry}>
            <Surface color={CAT.cream} />
          </mesh>
          <Torus radius={EYE_RADIUS * 1.09} tube={0.0006} rotation={[Math.PI / 2, 0, 0]} color="#4a3020" noCast noInk />
        </group>
      </group>
    </group>
  )
}

function Ear({ side, ear }: { side: -1 | 1; ear: (group: Group | null) => void }) {
  const outer = useMemo(() => earGeometry(0.037, 0.082), [])
  const inner = useMemo(() => earGeometry(0.0345, 0.077), [])
  const options = useMemo(
    () => ({ pattern: 'ear' as const, ...CAT.fur.ear, comb: [0, 0.6, 0] as [number, number, number] }),
    [],
  )
  return (
    <group ref={ear} position={[side * 0.049, 0.05, -0.016]} rotation={[-0.14, side * 0.42, side * -0.3]}>
      <FurShells geometry={outer} options={options} />
      <mesh geometry={inner} position={[0, 0.002, 0.004]}>
        <Surface color={CAT.earInner} doubleSided />
      </mesh>
    </group>
  )
}

function Whiskers() {
  const geometry = useMemo(() => {
    const whiskers: BufferGeometry[] = []
    for (const s of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const start = new Vector3(s * (0.024 + col * 0.008), -0.024 - row * 0.0065, 0.078 - col * 0.006)
          const reach = 0.1 + col * 0.012 - row * 0.008
          const end = new Vector3(s * (0.024 + reach), -0.022 - row * 0.026, 0.05 - col * 0.012)
          const mid = new Vector3(s * (0.024 + reach * 0.55), start.y + 0.012 - row * 0.002, 0.075)
          whiskers.push(new TubeGeometry(new QuadraticBezierCurve3(start, mid, end), 7, 0.00062, 3))
        }
      }
      // the longer brow whiskers
      for (const lift of [0, 1]) {
        const start = new Vector3(s * (0.03 + lift * 0.01), 0.038, 0.058)
        const end = new Vector3(s * (0.062 + lift * 0.014), 0.078 + lift * 0.004, 0.05)
        const mid = new Vector3(s * (0.046 + lift * 0.01), 0.07, 0.06)
        whiskers.push(new TubeGeometry(new QuadraticBezierCurve3(start, mid, end), 5, 0.00048, 3))
      }
    }
    return mergeGeometries(whiskers)
  }, [])
  return <Part geometry={geometry} color="#fffaf0" noCast noInk />
}

function Muzzle({ mouth: mouthRef }: { mouth: (group: Group | null) => void }) {
  const ink = '#3a2218'
  const mouth = useMemo(() => {
    const line = (a: Vector3, b: Vector3, c: Vector3, segments: number) =>
      new TubeGeometry(new QuadraticBezierCurve3(a, b, c), segments, 0.0009, 4)
    return mergeGeometries([
      // philtrum, then the small "w"
      line(new Vector3(0, -0.019, 0.095), new Vector3(0, -0.026, 0.0965), new Vector3(0, -0.032, 0.094), 4),
      ...[-1, 1].map((s) =>
        line(new Vector3(0, -0.032, 0.094), new Vector3(s * 0.009, -0.041, 0.094), new Vector3(s * 0.022, -0.033, 0.083), 8),
      ),
    ])
  }, [])
  return (
    <group>
      {/* the nose: a soft inverted triangle with a dark upper edge */}
      <Sph radius={0.0115} position={[0, -0.0125, 0.0915]} scale={[1.05, 0.72, 0.62]} color={CAT.nose} gloss segments={14} noCast noInk />
      <Sph radius={0.0028} position={[-0.0052, -0.0118, 0.0975]} scale={[1.3, 0.7, 0.5]} color="#7a4442" segments={8} noCast noInk />
      <Sph radius={0.0028} position={[0.0052, -0.0118, 0.0975]} scale={[1.3, 0.7, 0.5]} color="#7a4442" segments={8} noCast noInk />
      <Part geometry={mouth} color={ink} noCast noInk />
      {/* opens for a meow */}
      <group ref={mouthRef} position={[0, -0.041, 0.088]} scale={[1, 0.001, 1]}>
        <Sph radius={0.014} scale={[1.15, 1, 0.5]} color="#6e2c30" segments={10} noCast noInk />
        <Sph radius={0.009} position={[0, -0.005, 0.004]} scale={[1, 0.6, 0.5]} color="#d9767a" segments={8} noCast noInk />
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- legs

const UPPER = 0.115
const LOWER = 0.115
const FOOT = 0.09

/** A leg bone: a tapered tube hanging from its joint at the origin, down local -Y. */
function boneGeometry(length: number, top: number, bottom: number, swell = 0) {
  const points: Vector2[] = []
  const rows = 8
  // rounded over the top, tapered down the length, rounded under the bottom
  points.push(new Vector2(0.0001, top * 0.9))
  points.push(new Vector2(top * 0.72, top * 0.62))
  for (let j = 0; j <= rows; j++) {
    const t = j / rows
    points.push(new Vector2(MathUtils.lerp(top, bottom, t) + swell * Math.sin(t * Math.PI), -length * t))
  }
  points.push(new Vector2(bottom * 0.72, -length - bottom * 0.6))
  points.push(new Vector2(0.0001, -length - bottom * 0.9))
  return new LatheGeometry(points, 12)
}

function pawGeometry() {
  const geometry = new SphereGeometry(0.023, 14, 10)
  geometry.scale(1.05, 0.72, 1.4)
  geometry.translate(0, 0, 0.012)
  return geometry
}

/** Dark slits between the toes. */
function toesGeometry() {
  const slits: BufferGeometry[] = []
  for (const offset of [-0.0105, 0, 0.0105]) {
    slits.push(
      new TubeGeometry(
        new QuadraticBezierCurve3(new Vector3(offset, 0.014, 0.03), new Vector3(offset, 0.006, 0.05), new Vector3(offset, -0.012, 0.043)),
        5,
        0.0007,
        3,
      ),
    )
  }
  return mergeGeometries(slits)
}

const legFur = { ...CAT.fur.tail, comb: [0, -1, 0] as [number, number, number] }

interface LegBones {
  upper: Group | null
  lower: Group | null
  foot: Group | null
  paw: Group | null
}

function Leg({ bones, front, geometry }: { bones: LegBones; front: boolean; geometry: ReturnType<typeof legGeometries> }) {
  const upperFur = useMemo(() => ({ pattern: 'leg' as const, ...legFur }), [])
  const lowerFur = useMemo(() => ({ pattern: 'leg' as const, ...legFur, sock: front ? -0.078 : -9 }), [front])
  const footFur = useMemo(() => ({ pattern: 'leg' as const, ...legFur, sock: -0.03 }), [])
  const pawFur = useMemo(() => ({ pattern: 'leg' as const, ...legFur, sock: 9 }), [])
  const shells = CAT.legShells
  return (
    <>
      <group ref={(g) => void (bones.upper = g)}>
        <FurShells geometry={front ? geometry.arm : geometry.thigh} options={upperFur} shells={shells} />
      </group>
      <group ref={(g) => void (bones.lower = g)}>
        <FurShells geometry={front ? geometry.forearm : geometry.shank} options={lowerFur} shells={shells} />
      </group>
      {!front && (
        <group ref={(g) => void (bones.foot = g)}>
          <FurShells geometry={geometry.foot} options={footFur} shells={shells} castShadow={false} />
        </group>
      )}
      <group ref={(g) => void (bones.paw = g)}>
        <FurShells geometry={geometry.paw} options={pawFur} shells={shells} />
        <Part geometry={geometry.toes} color="#b49a84" noCast noInk />
      </group>
    </>
  )
}

function legGeometries() {
  return {
    arm: boneGeometry(UPPER, 0.034, 0.024),
    forearm: boneGeometry(LOWER, 0.024, 0.017),
    thigh: boneGeometry(UPPER, 0.05, 0.028, 0.003),
    shank: boneGeometry(LOWER, 0.028, 0.016),
    foot: boneGeometry(FOOT, 0.018, 0.016),
    paw: pawGeometry(),
    toes: toesGeometry(),
  }
}

// ---------------------------------------------------------------- poses

/** Everything a pose sets, in the root's space, with the surface at y = 0. Paws are for the +X side and mirror across. */
interface Pose {
  raise: number
  pitch: number
  frontPaw: Vec3
  hindPaw: Vec3
  /** From the hind paw up to the hock: flat along the floor when folded, standing when the cat is up. */
  hock: Vec3
  tail: [Vec3, Vec3, Vec3]
  /** 0 when the tail lies flat in a curl, 1 when it's held up off the surface. */
  tailUp: number
}

const POSES: Record<CatPose, Pose> = {
  loaf: {
    raise: 0,
    pitch: 0,
    frontPaw: [0.04, 0.018, 0.195],
    hindPaw: [0.08, 0.016, -0.11],
    hock: [0.002, 0.014, -0.1],
    tail: [[0.3, 0.032, -0.33], [0.26, 0.03, 0.08], [0.09, 0.034, 0.21]],
    tailUp: 0,
  },
  sit: {
    raise: 0.07,
    pitch: -0.62,
    frontPaw: [0.04, 0.018, 0.135],
    hindPaw: [0.082, 0.016, -0.015],
    hock: [0.002, 0.016, -0.112],
    tail: [[0.22, 0.03, -0.36], [0.26, 0.03, 0.02], [0.13, 0.03, 0.18]],
    tailUp: 0,
  },
  stand: {
    raise: 0.125,
    pitch: 0.03,
    frontPaw: [0.044, 0.018, 0.115],
    hindPaw: [0.056, 0.018, -0.185],
    hock: [0, 0.082, -0.04],
    tail: [[0.02, 0.36, -0.42], [0.01, 0.6, -0.44], [0.03, 0.68, -0.3]],
    tailUp: 1,
  },
  crouch: {
    raise: 0.03,
    pitch: 0.1,
    frontPaw: [0.044, 0.018, 0.175],
    hindPaw: [0.062, 0.018, -0.145],
    hock: [0, 0.05, -0.075],
    tail: [[0.02, 0.13, -0.46], [0.03, 0.1, -0.64], [0.05, 0.11, -0.8]],
    tailUp: 1,
  },
  air: {
    raise: 0.13,
    pitch: 0,
    frontPaw: [0.04, 0.06, 0.32],
    hindPaw: [0.056, 0.1, -0.4],
    hock: [0, 0.03, 0.08],
    tail: [[0, 0.26, -0.5], [0, 0.3, -0.7], [0, 0.36, -0.82]],
    tailUp: 1,
  },
  // chest to the ground and rump in the air, front paws reaching: the big stretch
  stretch: {
    raise: 0.07,
    pitch: 0.46,
    frontPaw: [0.04, 0.018, 0.33],
    hindPaw: [0.056, 0.018, -0.17],
    hock: [0, 0.082, -0.04],
    tail: [[0.01, 0.42, -0.42], [0.02, 0.62, -0.46], [0.05, 0.7, -0.36]],
    tailUp: 1,
  },
}
const POSE_NAMES = Object.keys(POSES) as CatPose[]

const PIVOT = 0.12
const SHOULDER: Vec3 = [0.046, 0.14, 0.095]
const HIP: Vec3 = [0.06, 0.135, -0.165]
const TAIL_ROOT = new Vector3(0.02, 0.09, -0.27)
const WRIST_LIFT = 0.03

// Lateral-sequence walk: each paw leaves the ground a quarter of a stride after the last.
const DUTY = 0.65
const LIFT = 0.042
const LEGS = [
  { side: -1, front: false, offset: 0 },
  { side: -1, front: true, offset: 0.25 },
  { side: 1, front: false, offset: 0.5 },
  { side: 1, front: true, offset: 0.75 },
] as const

const DOWN = new Vector3(0, -1, 0)
const scratch = {
  a: new Vector3(),
  b: new Vector3(),
  c: new Vector3(),
  d: new Vector3(),
  e: new Vector3(),
  q: new Quaternion(),
  qInverse: new Quaternion(),
  euler: new Euler(),
}

/** Solves the middle joint of a two-bone limb, bending toward the pole. Writes the joint. */
function solveKnee(from: Vector3, to: Vector3, pole: Vector3, joint: Vector3) {
  const reach = UPPER + LOWER
  const direction = scratch.e.subVectors(to, from)
  const distance = MathUtils.clamp(direction.length(), 0.012, reach * 0.999)
  direction.normalize()
  const along = (UPPER * UPPER + distance * distance - LOWER * LOWER) / (2 * distance)
  const height = Math.sqrt(Math.max(UPPER * UPPER - along * along, 0))
  const bend = scratch.d.copy(pole).addScaledVector(direction, -pole.dot(direction)).normalize()
  joint.copy(from).addScaledVector(direction, along).addScaledVector(bend, height)
}

function aimBone(bone: Group | null, from: Vector3, to: Vector3) {
  if (!bone) return
  bone.position.copy(from)
  bone.quaternion.setFromUnitVectors(DOWN, scratch.d.subVectors(to, from).normalize())
}

const POLE_FRONT = new Vector3(0, -0.25, -1).normalize()

// ---------------------------------------------------------------- the cat

const TAIL_RINGS = 14
const TAIL_SIDES = 6

/** The tail's fur bends in a shader that shadows and the hover outline can't see, so this invisible tube follows it in JS. */
function makeTailProxy() {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array((TAIL_RINGS + 1) * TAIL_SIDES * 3), 3))
  const indices: number[] = []
  for (let j = 0; j < TAIL_RINGS; j++) {
    for (let i = 0; i < TAIL_SIDES; i++) {
      const p = j * TAIL_SIDES + i
      const q = j * TAIL_SIDES + ((i + 1) % TAIL_SIDES)
      indices.push(p, q, p + TAIL_SIDES, q, q + TAIL_SIDES, p + TAIL_SIDES)
    }
  }
  geometry.setIndex(indices)
  return geometry
}

const noiseWave = (t: number, a: number, b: number) => Math.sin(t * a) * 0.6 + Math.sin(t * b + 1.3) * 0.4

export function Cat() {
  const { scale } = LAYOUT.cat

  const parts = useMemo(
    () => ({
      body: sculptGeometry(bodyField, { center: [0, 0.11, -0.02], reach: 0.42, axis: 'z', around: 60, along: 46 }),
      head: sculptGeometry(headField, { center: [0, 0, 0.005], reach: 0.16, axis: 'x', around: 56, along: 48 }),
      tail: tailGeometry(),
      tailProxy: makeTailProxy(),
      z: makeCanvasTexture(96, 96, (ctx, w, h) => {
        ctx.fillStyle = '#dfe7ff'
        ctx.font = '800 76px "Sora", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('z', w / 2, h / 2)
      }),
      legs: legGeometries(),
    }),
    [],
  )
  const tail = useMemo(
    () => ({
      p0: TAIL_ROOT.clone(),
      p1: new Vector3(...POSES.loaf.tail[0]),
      p2: new Vector3(...POSES.loaf.tail[1]),
      p3: new Vector3(...POSES.loaf.tail[2]),
      ref: new Vector3(0, 1, 0),
      length: 0.56,
    }),
    [],
  )
  const bodyFur = useMemo(() => ({ pattern: 'body' as const, ...CAT.fur.body, comb: [0, -0.35, -1] as [number, number, number] }), [])
  const headFur = useMemo(() => ({ pattern: 'head' as const, ...CAT.fur.head, comb: [0, 0.25, -1] as [number, number, number] }), [])
  const tailFur = useMemo(() => ({ pattern: 'tail' as const, ...CAT.fur.tail, comb: [0, -0.3, 0.2] as [number, number, number], tail }), [tail])

  const root = useRef<Group>(null)
  const outer = useRef<Group>(null)
  const barrel = useRef<Group>(null)
  const head = useRef<Group>(null)
  const lids = useRef<(Group | null)[]>([])
  const ears = useRef<(Group | null)[]>([])
  const mouth = useRef<Group | null>(null)
  const sleepZs = useRef<(Sprite | null)[]>([])
  const bones = useMemo<LegBones[]>(() => LEGS.map(() => ({ upper: null, lower: null, foot: null, paw: null })), [])

  const motion = useRef({
    weights: { loaf: 1, sit: 0, stand: 0, crouch: 0, air: 0, stretch: 0 } as Record<CatPose, number>,
    time: 0,
    gaitBlend: 0,
    blink: 0,
    nextBlink: 3,
    wag: 0,
    lid: 0.8,
    earTwitch: [0, 0],
    nextTwitch: 4,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  })

  useFrame(({ camera, pointer }, rawDelta) => {
    const m = motion.current
    if (!root.current || !outer.current || !barrel.current || !head.current) return
    const delta = Math.min(rawDelta, 0.1)
    m.time += delta
    const state = useCafe.getState()
    const attending = state.focus === 'cat'

    tickCat(delta, attending, m.reduced)
    setPurr(cat.purring && state.soundOn && (attending || state.hovered === 'cat'))

    root.current.position.copy(cat.position)
    root.current.rotation.y = cat.yaw

    // ---- blend the poses
    let total = 0
    for (const name of POSE_NAMES) {
      easing.damp(m.weights, name, name === cat.pose ? 1 : 0, cat.pose === 'air' ? 0.05 : cat.pose === 'stretch' ? 0.3 : 0.11, delta)
      total += m.weights[name]
    }
    const blend = (pick: (pose: Pose) => number) => POSE_NAMES.reduce((sum, name) => sum + pick(POSES[name]) * m.weights[name], 0) / total
    const blendVec = (out: Vector3, pick: (pose: Pose) => Vec3) => {
      out.set(0, 0, 0)
      for (const name of POSE_NAMES) {
        const [x, y, z] = pick(POSES[name])
        const w = m.weights[name] / total
        out.x += x * w
        out.y += y * w
        out.z += z * w
      }
      return out
    }

    // ---- the torso
    const moving = Math.min(1, cat.speed / 0.16 + cat.turning * 0.6)
    easing.damp(m, 'gaitBlend', moving, 0.12, delta)
    const swing = cat.gait * Math.PI * 2
    const raise = blend((p) => p.raise) + Math.abs(Math.sin(swing)) * 0.007 * m.gaitBlend
    const pitch = blend((p) => p.pitch) + cat.airPitch
    const roll = Math.sin(swing) * 0.03 * m.gaitBlend
    outer.current.position.y = PIVOT + raise
    outer.current.rotation.set(pitch, 0, roll)
    outer.current.updateMatrix()

    // A slow breath always, and the fine tremor of a purr on top of it.
    const breath = Math.sin(m.time * (cat.dozing ? 1.5 : 2.1)) * 0.012
    const tremor = cat.purring && !m.reduced ? Math.sin(m.time * 151) * 0.0032 : 0
    barrel.current.scale.set(1 + breath + tremor, 1 + breath * 1.3 + tremor, 1)

    // From the root's space to the space the legs live in.
    scratch.euler.set(pitch, 0, roll)
    scratch.q.setFromEuler(scratch.euler)
    scratch.qInverse.copy(scratch.q).invert()
    const toBody = (v: Vector3) => {
      v.y -= PIVOT + raise
      v.applyQuaternion(scratch.qInverse)
      v.y += PIVOT
      return v
    }

    // ---- the legs, each with its paw placed by the gait
    const stride = (DUTY * CAT_STRIDE) / scale
    LEGS.forEach((leg, i) => {
      const bone = bones[i]
      const paw = blendVec(scratch.a, leg.front ? (p) => p.frontPaw : (p) => p.hindPaw)
      const hockOffset = leg.front ? null : blendVec(scratch.b, (p) => p.hock)
      paw.x *= leg.side
      if (hockOffset) hockOffset.x *= leg.side

      if (m.gaitBlend > 0.001) {
        const phase = MathUtils.euclideanModulo(cat.gait + leg.offset, 1)
        const scaleWalk = stride * m.gaitBlend
        if (phase < DUTY) {
          paw.z += scaleWalk * (0.5 - phase / DUTY)
        } else {
          const s = (phase - DUTY) / (1 - DUTY)
          paw.z += scaleWalk * (-0.5 + s * s * (3 - 2 * s))
          paw.y += LIFT * Math.sin(s * Math.PI) * m.gaitBlend
        }
      }

      const joint = scratch.c

      if (leg.front) {
        const wrist = new Vector3(paw.x, paw.y + WRIST_LIFT, paw.z - 0.006)
        toBody(wrist)
        const shoulder = new Vector3(SHOULDER[0] * leg.side, SHOULDER[1], SHOULDER[2])
        solveKnee(shoulder, wrist, POLE_FRONT, joint)
        aimBone(bone.upper, shoulder, joint)
        aimBone(bone.lower, joint, wrist)
      } else {
        const hock = new Vector3(paw.x + hockOffset!.x, paw.y + hockOffset!.y, paw.z + hockOffset!.z)
        toBody(hock)
        const hip = new Vector3(HIP[0] * leg.side, HIP[1], HIP[2])
        const pole = new Vector3(leg.side * 0.25, 0, 1).normalize()
        solveKnee(hip, hock, pole, joint)
        aimBone(bone.upper, hip, joint)
        aimBone(bone.lower, joint, hock)
        const pawBody = toBody(paw.clone())
        aimBone(bone.foot, hock, pawBody)
        if (bone.foot) bone.foot.scale.y = hock.distanceTo(pawBody) / FOOT
      }

      if (bone.paw) {
        toBody(paw)
        bone.paw.position.copy(paw)
        bone.paw.quaternion.copy(scratch.qInverse) // paws stay flat on the surface whatever the body does
      }
    })

    // ---- the head: looks about, then at whoever's looking at it
    const local = scratch.c.copy(camera.position).sub(cat.position)
    local.applyAxisAngle(POLE_UP, -cat.yaw)
    const distance = Math.hypot(local.x, local.z)
    let yaw = MathUtils.clamp(Math.atan2(local.x, local.z), -1.05, 1.05)
    let tilt = MathUtils.clamp(-Math.atan2(local.y - 0.3, distance), -0.45, 0.3)
    if (attending || cat.pose === 'loaf' || cat.pose === 'sit') {
      // At rest it follows the cursor a little, from wherever it's already looking.
      yaw += pointer.x * 0.42
      tilt -= pointer.y * 0.2
      if (cat.dozing && !attending) {
        yaw *= 0.5
        tilt = 0.1
      }
    } else {
      yaw = noiseWave(m.time, 0.7, 1.9) * 0.22
      tilt = cat.pose === 'air' ? 0.1 : 0.04
    }
    const { rotation } = head.current
    rotation.order = 'YXZ'
    easing.damp(rotation, 'y', yaw, 0.28, delta)
    // undoes the body's pitch, so a sitting cat isn't staring at the ceiling
    easing.damp(rotation, 'x', -0.08 + tilt - pitch, cat.pose === 'air' ? 0.08 : 0.2, delta)
    rotation.z = cat.purring ? Math.sin(m.time * 151) * 0.0022 : 0

    // ---- eyes and ears
    if (!m.reduced) {
      m.nextBlink -= delta
      if (m.nextBlink < 0) {
        m.blink = 1
        m.nextBlink = MathUtils.randFloat(2.5, 7)
      }
      m.blink = Math.max(0, m.blink - delta * 6)
      m.nextTwitch -= delta
      if (m.nextTwitch < 0) {
        m.earTwitch[Math.random() < 0.5 ? 0 : 1] = 1
        m.nextTwitch = MathUtils.randFloat(3, 9)
      }
    }
    // Half shut with contentment when purring at a visitor, nearly shut when dozing.
    easing.damp(m, 'lid', attending ? 0.16 : cat.dozing ? 0.82 : 0.04, 0.3, delta)
    const shut = Math.max(m.lid, Math.sin(m.blink * Math.PI))
    lids.current.forEach((lid) => {
      if (lid) lid.rotation.x = MathUtils.lerp(LID_OPEN, LID_SHUT, shut)
    })
    ears.current.forEach((ear, i) => {
      if (!ear) return
      m.earTwitch[i] = Math.max(0, m.earTwitch[i] - delta * 5)
      const side = i === 0 ? -1 : 1
      ear.rotation.z = side * -0.3 + side * -0.22 * Math.sin(m.earTwitch[i] * Math.PI)
    })

    // A meow: the jaw drops and the head tips up.
    const meowing = cat.meow > 0 ? Math.sin((cat.meow / 0.6) * Math.PI) : 0
    if (mouth.current) mouth.current.scale.y = Math.max(0.001, meowing)
    rotation.x -= meowing * 0.14

    // Zs drifting up from a cat asleep after dark.
    const asleep = cat.dozing && dusk.night > 0.5 && !attending
    sleepZs.current.forEach((z, i) => {
      if (!z) return
      const phase = (m.time * 0.22 + i / 3) % 1
      z.position.set(0.05 + phase * 0.1 + Math.sin(phase * 7 + i) * 0.012, 0.3 + phase * 0.2, 0.2)
      z.scale.setScalar(0.022 + phase * 0.038)
      z.material.opacity = asleep && !m.reduced ? Math.sin(phase * Math.PI) * 0.9 : 0
      z.visible = z.material.opacity > 0.01
    })

    // ---- the tail
    const wagTarget = cat.wagging ? 1 : cat.pose === 'stand' ? 0.45 : cat.pose === 'loaf' ? 0.22 : cat.pose === 'sit' ? 0.3 : 0
    easing.damp(m, 'wag', m.reduced ? 0 : wagTarget, 0.3, delta)
    const flat = 1 - blend((p) => p.tailUp)
    const beat = cat.wagging ? 5.2 : flat > 0.5 ? 1.7 : 2.6
    const s = noiseWave(m.time, beat, beat * 1.73) * m.wag

    tail.p0.copy(TAIL_ROOT)
    tail.p0.y -= PIVOT
    tail.p0.applyQuaternion(scratch.q)
    tail.p0.y += PIVOT + raise
    blendVec(tail.p1, (p) => p.tail[0])
    blendVec(tail.p2, (p) => p.tail[1])
    blendVec(tail.p3, (p) => p.tail[2])
    tail.p2.x += s * 0.04
    tail.p2.z += s * 0.02 * flat
    tail.p3.x += s * 0.1
    tail.p3.z += s * 0.06 * flat
    tail.p3.y += Math.abs(s) * 0.012 * flat
    tail.ref.set(1 - flat, flat, 0).normalize()

    updateTailProxy(parts.tailProxy, tail)
  })

  return (
    <group ref={root} scale={scale}>
      <group ref={outer} position={[0, PIVOT, 0]}>
        <group position={[0, -PIVOT, 0]}>
          <group ref={barrel} position={[0, PIVOT, 0]}>
            <group position={[0, -PIVOT, 0]}>
              <FurShells geometry={parts.body} options={bodyFur} />
            </group>
          </group>

          {LEGS.map((leg, i) => (
            <Leg key={i} bones={bones[i]} front={leg.front} geometry={parts.legs} />
          ))}

          <group ref={head} position={[0, 0.222, 0.172]} rotation={[-0.08, 0, 0]} scale={1.04}>
            <FurShells geometry={parts.head} options={headFur} />
            <Eye side={-1} lid={(g) => void (lids.current[0] = g)} />
            <Eye side={1} lid={(g) => void (lids.current[1] = g)} />
            <Muzzle mouth={(g) => void (mouth.current = g)} />
            <Whiskers />
            <Ear side={-1} ear={(g) => void (ears.current[0] = g)} />
            <Ear side={1} ear={(g) => void (ears.current[1] = g)} />
          </group>
        </group>
      </group>

      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(z) => void (sleepZs.current[i] = z)} visible={false}>
          <spriteMaterial map={parts.z} transparent depthWrite={false} opacity={0} fog={false} />
        </sprite>
      ))}

      <FurShells geometry={parts.tail} options={tailFur} castShadow={false} />
      <mesh geometry={parts.tailProxy} material={shadowOnly} castShadow frustumCulled={false} />
    </group>
  )
}

const POLE_UP = new Vector3(0, 1, 0)
const spine = new Vector3()
const ahead = new Vector3()
const sideways = new Vector3()
const upward = new Vector3()

function bezier(out: Vector3, t: number, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3) {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return out.set(a * p0.x + b * p1.x + c * p2.x + d * p3.x, a * p0.y + b * p1.y + c * p2.y + d * p3.y, a * p0.z + b * p1.z + c * p2.z + d * p3.z)
}

function updateTailProxy(geometry: BufferGeometry, { p0, p1, p2, p3, ref }: { p0: Vector3; p1: Vector3; p2: Vector3; p3: Vector3; ref: Vector3 }) {
  const position = geometry.attributes.position
  for (let j = 0; j <= TAIL_RINGS; j++) {
    const t = j / TAIL_RINGS
    bezier(spine, t, p0, p1, p2, p3)
    bezier(ahead, Math.min(t + 0.02, 1), p0, p1, p2, p3)
    bezier(upward, Math.max(t - 0.02, 0), p0, p1, p2, p3)
    ahead.sub(upward).normalize()
    sideways.crossVectors(ref, ahead).normalize()
    upward.crossVectors(ahead, sideways).normalize()
    for (let i = 0; i < TAIL_SIDES; i++) {
      const angle = (i / TAIL_SIDES) * Math.PI * 2
      const x = Math.cos(angle) * 0.024
      const y = Math.sin(angle) * 0.024
      position.setXYZ(
        j * TAIL_SIDES + i,
        spine.x + sideways.x * x + upward.x * y,
        spine.y + sideways.y * x + upward.y * y,
        spine.z + sideways.z * x + upward.z * y,
      )
    }
  }
  position.needsUpdate = true
}
