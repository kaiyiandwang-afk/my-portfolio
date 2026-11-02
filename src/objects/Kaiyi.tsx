import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { MathUtils, QuadraticBezierCurve3, RepeatWrapping, TubeGeometry, Vector3 } from 'three'
import type { Group, Mesh, MeshToonMaterial } from 'three'
import { LAYOUT, PALETTE } from '../config'
import type { Vec3 } from '../config'
import { ellipsoid, sculptGeometry, smax, smin } from '../shaders/sculpt'
import { FACE_BOUNDS, paintKaiyiFace } from '../shaders/paintFace'
import { toonMaterial } from '../shaders/toon'
import { useCafe } from '../state/store'
import { hairGeometry, hairMaterial } from './kaiyiHair'
import { Cyl, Inked, Limb, Part, Sph, Surface, Torus, makeCanvasTexture } from './prims'

/**
 * Kaiyi, modeled after her photos and cel-shaded to sit in the painting. Built facing local +Z; the layout turns her
 * toward the window. The seat's top surface is at y = 0.745, and her foot ring is at y = 0.26: she sits on both.
 */

const SEAT_TOP = 0.745
const HEAD_CENTER: Vec3 = [0, 1.415, 0.022]
/** Resting tilt, looking down at the laptop. */
const REST_PITCH = 0.17
/** Brings the head down toward real proportions and gives her a longer neck. */
const HEAD_SCALE = 0.92
const HAND_Y = 1.063
const CHEST_Y = 1.08
const FACE_TINT = '#ecdccd'

/** How long she stays at each thing, in seconds, while nobody's talking to her. */
const HABITS = {
  typing: [5, 12] as [number, number],
  thinking: [1.6, 3.4] as [number, number],
  window: [2.4, 4.6] as [number, number],
}
type Habit = keyof typeof HABITS

/** A soft oval tapering to a gentle chin, with a straight nose and small full lips, in head-space meters. */
function headField(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  let d = ellipsoid(x, y, z, 0, 0.035, -0.012, 0.1, 0.118, 0.12) // cranium
  d = smin(d, ellipsoid(x, y, z, 0, -0.024, 0.026, 0.088, 0.096, 0.082), 0.04) // the plane of the face
  d = smin(d, ellipsoid(x, y, z, 0, -0.072, 0.036, 0.068, 0.052, 0.06), 0.05) // jaw, narrower than the cheeks
  d = smin(d, ellipsoid(x, y, z, 0, -0.106, 0.054, 0.028, 0.021, 0.024), 0.04) // chin
  d = smax(d, -ellipsoid(ax, y, z, 0.11, -0.085, 0.05, 0.028, 0.05, 0.05), 0.05) // the jaw's gentle slope
  d = smin(d, ellipsoid(x, y, z, 0, -0.008, 0.1, 0.0095, 0.032, 0.014), 0.022) // bridge of the nose
  d = smin(d, ellipsoid(x, y, z, 0, -0.036, 0.113, 0.0125, 0.0105, 0.012), 0.016) // tip of the nose
  d = smin(d, ellipsoid(x, y, z, 0, -0.066, 0.102, 0.021, 0.0072, 0.009), 0.012) // upper lip
  d = smin(d, ellipsoid(x, y, z, 0, -0.078, 0.101, 0.018, 0.0085, 0.01), 0.012) // lower lip
  return d
}

/** Slim through the waist, with a wide boat neck. Sweater, so softly rounded. */
function torsoField(x: number, y: number, z: number) {
  const ax = Math.abs(x)
  let d = ellipsoid(x, y, z, 0, 1.085, 0, 0.136, 0.13, 0.102) // chest
  d = smin(d, ellipsoid(x, y, z, 0, 0.95, -0.005, 0.116, 0.1, 0.088), 0.05) // waist
  d = smin(d, ellipsoid(x, y, z, 0, 0.85, -0.012, 0.142, 0.09, 0.114), 0.05) // hem over the hips
  d = smin(d, ellipsoid(ax, y, z, 0.132, 1.17, 0, 0.062, 0.052, 0.062), 0.05) // shoulder
  d = smin(d, ellipsoid(x, y, z, 0, 1.2, 0, 0.1, 0.05, 0.078), 0.05) // slope up to the neck
  // the sweater ends at the hips, sitting just above the seat
  return smax(d, SEAT_TOP + 0.052 - y, 0.012)
}

function pelvisField(x: number, y: number, z: number) {
  return smax(ellipsoid(x, y, z, 0, 0.84, -0.012, 0.142, 0.095, 0.118), SEAT_TOP + 0.002 - y, 0.01)
}

/** Fine vertical ribbing, so the white sweater reads as knit even in flat light. */
function knitTexture() {
  const texture = makeCanvasTexture(128, 16, (ctx, w, h) => {
    ctx.fillStyle = '#ece6dc'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#cfc7ba'
    for (let x = 0; x < w; x += 8) ctx.fillRect(x, 0, 2.4, h)
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(6, 1)
  return texture
}

function Hand({ side, hand }: { side: -1 | 1; hand: (group: Group | null) => void }) {
  const skin = PALETTE.skin
  const fingers = [-0.024, -0.008, 0.008, 0.024]
  return (
    <group ref={hand} position={[side * 0.092, HAND_Y, 0.6]} rotation={[0.1, side * 0.16, 0]}>
      <Sph radius={0.036} scale={[1.05, 0.5, 1.15]} color={skin} segments={14} noInk />
      {fingers.map((x) => (
        <Limb key={x} from={[x, -0.004, 0.028]} to={[x * 1.15, -0.018, 0.066 - Math.abs(x) * 0.5]} radius={0.0082} color={skin} />
      ))}
      <Limb from={[-side * 0.03, -0.004, 0.012]} to={[-side * 0.042, -0.014, 0.038]} radius={0.0092} color={skin} />
    </group>
  )
}

function Necklace() {
  const chain = useMemo(
    () =>
      new TubeGeometry(
        new QuadraticBezierCurve3(new Vector3(-0.07, 1.215, 0.058), new Vector3(0, 1.085, 0.135), new Vector3(0.07, 1.215, 0.058)),
        24,
        0.0014,
        4,
      ),
    [],
  )
  return (
    <group>
      <Part geometry={chain} color={PALETTE.brass} gloss noCast noInk />
      <Sph radius={0.0078} position={[0, 1.15, 0.111]} scale={[1, 1.15, 0.6]} color="#dff3f2" gloss segments={10} noCast noInk />
    </group>
  )
}

/** Ear and gold hoop. On her right, the hair tucks behind this, so the hoop shows as in her photo. */
function Ear({ side }: { side: -1 | 1 }) {
  return (
    <group position={[side * 0.1, -0.02, 0.002]} rotation={[0, side * 0.3, side * -0.1]}>
      <Sph radius={0.021} scale={[0.32, 1, 0.64]} color={PALETTE.skin} segments={12} noInk />
      {/* hangs turned partly toward the front, so it reads as a ring from most angles */}
      <Torus radius={0.024} tube={0.0015} position={[side * 0.006, -0.043, 0]} rotation={[0, side * 0.75, 0]} color={PALETTE.brass} gloss noCast noInk />
    </group>
  )
}

const GOLD_WIRE = '#8a6428'
const LENS = { x: 0.047, y: 0.008, z: 0.122, radius: 0.0325, oval: 1.12, wire: 0.0019 }

/** Thin gold wire with slightly oval lenses, sitting on the bridge of her nose. A child of the head, so they turn with her. */
function Spectacles() {
  const { x, y, z, radius, oval, wire } = LENS
  const reach = x + radius * oval
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Torus radius={radius} tube={wire} position={[side * x, y, z]} scale={[oval, 1, 1]} color={GOLD_WIRE} gloss noCast noInk />
          {/* the glass: barely there, unlit, so the sun doesn't fog her eyes behind it */}
          <mesh position={[side * x, y, z - 0.0006]} scale={[oval, 1, 1]}>
            <circleGeometry args={[radius, 28]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.035} depthWrite={false} />
          </mesh>
          <Limb from={[side * reach, y + 0.007, z - 0.002]} to={[side * 0.1, y + 0.012, 0.03]} radius={wire} color={GOLD_WIRE} />
          {/* nose pads */}
          <Sph radius={0.0026} position={[side * 0.0118, y - 0.012, 0.113]} scale={[0.7, 1.3, 0.7]} color="#f0e6d2" segments={6} noCast noInk />
        </group>
      ))}
      {/* the bridge, arching over her nose */}
      <mesh position={[0, y + 0.006, z + 0.001]} rotation={[0, 0, Math.PI * 0.14]}>
        <torusGeometry args={[0.0144, wire, 6, 14, Math.PI * 0.72]} />
        <Surface color={GOLD_WIRE} gloss />
      </mesh>
    </group>
  )
}

const local = new Vector3()
const smooth = new Vector3()

export function Kaiyi() {
  const { position, rotationY } = LAYOUT.kaiyi
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const chest = useRef<Group>(null)
  const hair = useRef<Mesh>(null)
  const face = useRef<Mesh>(null)
  const hands = useRef<(Group | null)[]>([])
  const eyeMaterials = useRef<{ open?: MeshToonMaterial; shut?: MeshToonMaterial }>({})
  const life = useRef({
    time: 0,
    habit: 'typing' as Habit,
    until: 6,
    nextBlink: 2.5,
    blink: 0,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  })

  const parts = useMemo(() => {
    const headMesh = sculptGeometry(headField, { center: [0, 0, 0.01], reach: 0.22, axis: 'y', around: 80, along: 64 })
    // project the painted face straight on from the front
    const { position: pos, uv } = headMesh.attributes
    const height = FACE_BOUNDS.top - FACE_BOUNDS.bottom
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + FACE_BOUNDS.halfWidth) / (FACE_BOUNDS.halfWidth * 2), (pos.getY(i) - FACE_BOUNDS.bottom) / height)
    }
    // Light sees a smooth egg, not the nose and cheeks, the way anime faces are shaded: the sculpt only shapes her outline,
    // and the painted features stay as painted instead of the cel bands carving lines across them.
    const { normal } = headMesh.attributes
    for (let i = 0; i < pos.count; i++) {
      smooth.set(pos.getX(i) / 0.0081, (pos.getY(i) + 0.01) / 0.0169, (pos.getZ(i) - 0.01) / 0.01).normalize()
      normal.setXYZ(i, smooth.x, smooth.y, smooth.z)
    }
    return {
      head: headMesh,
      torso: sculptGeometry(torsoField, { center: [0, 1.0, 0], reach: 0.42, axis: 'y', around: 72, along: 52 }),
      pelvis: sculptGeometry(pelvisField, { center: [0, 0.84, 0], reach: 0.24, axis: 'y', around: 36, along: 24 }),
      hair: hairGeometry(),
      face: paintKaiyiFace(),
      faceBlink: paintKaiyiFace(true),
      knit: knitTexture(),
      hairMat: hairMaterial(),
    }
  }, [])

  useLayoutEffect(() => {
    head.current?.rotation.set(REST_PITCH, 0, 0, 'YXZ')
  }, [])

  // Typing most of the time, with pauses to think or look out of the window. She looks up when you come to talk to her,
  // and catches your eye for a moment if you point at her.
  useFrame(({ camera }, rawDelta) => {
    if (!head.current || !body.current) return
    const delta = Math.min(rawDelta, 0.1)
    const me = life.current
    me.time += delta
    const { focus, hovered } = useCafe.getState()
    const talking = focus === 'kaiyi'

    if (me.time > me.until && !me.reduced) {
      const roll = Math.random()
      me.habit = me.habit !== 'typing' ? 'typing' : roll < 0.6 ? 'thinking' : 'window'
      me.until = me.time + MathUtils.randFloat(...HABITS[me.habit])
    }

    let yaw = 0
    let pitch = REST_PITCH
    if (talking || hovered === 'kaiyi') {
      body.current.worldToLocal(local.copy(camera.position))
      local.sub(new Vector3(...HEAD_CENTER))
      const reach = talking ? 1.32 : 0.7
      yaw = MathUtils.clamp(Math.atan2(local.x, local.z), -reach, reach)
      pitch = MathUtils.clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.2, 0.25)
    } else if (me.habit === 'thinking') {
      yaw = -0.16
      pitch = -0.08
    } else if (me.habit === 'window') {
      yaw = 0.42
      pitch = -0.1
    } else if (!me.reduced) {
      // eyes on the screen, with a small drift
      yaw = Math.sin(me.time * 0.23) * 0.05
      pitch = REST_PITCH + Math.sin(me.time * 0.31) * 0.012
    }
    const { rotation } = head.current
    easing.damp(rotation, 'y', yaw, 0.32, delta)
    easing.damp(rotation, 'x', pitch, 0.32, delta)
    parts.hairMat.uniforms.uYaw.value = rotation.y
    parts.hairMat.uniforms.uPitch.value = rotation.x
    parts.hairMat.uniforms.uSway.value = me.reduced ? 0 : me.time * 0.9

    // Breathing: the chest swells, and her head rides up and down on it.
    const breath = me.reduced ? 0 : Math.sin(me.time * 1.45)
    if (chest.current) chest.current.scale.set(1 + breath * 0.006, 1 + breath * 0.007, 1 + breath * 0.016)
    const lift = breath * 0.0028
    head.current.position.y = HEAD_CENTER[1] + lift
    if (hair.current) hair.current.position.y = HEAD_CENTER[1] + lift

    // Each hand taps out its own uneven rhythm while she types.
    const typing = me.habit === 'typing' && !talking && !me.reduced
    hands.current.forEach((hand, i) => {
      if (!hand) return
      const t = me.time * (7.3 + i * 1.7) + i * 2.1
      const taps = typing ? Math.max(0, Math.sin(t) * Math.sin(t * 0.37 + i)) : 0
      easing.damp(hand.position, 'y', HAND_Y + taps * 0.0075 + (typing ? 0 : 0.003), 0.04, delta)
      easing.damp(hand.rotation, 'x', 0.1 - taps * 0.1, 0.05, delta)
    })

    // Blinks are a quick swap to the painted face with its eyes shut.
    if (!me.reduced && face.current) {
      me.nextBlink -= delta
      if (me.nextBlink < 0) {
        me.blink = 0.13
        // now and then, two in a row
        me.nextBlink = Math.random() < 0.2 ? 0.28 : MathUtils.randFloat(2.2, 6)
      }
      me.blink -= delta
      const open = eyeMaterials.current
      if (!open.open) {
        open.open = face.current.material as MeshToonMaterial
        open.shut = toonMaterial({ color: FACE_TINT, map: parts.faceBlink })
      }
      face.current.material = me.blink > 0 ? open.shut! : open.open
    }
  })

  if (import.meta.env.DEV) Object.assign(window, { cafeKaiyi: life.current })

  const { sweater, jeans, cream } = PALETTE

  return (
    <group ref={body} position={position} rotation={[0, rotationY, 0]}>
      <Inked>
        {/* legs first: thighs rest on top of the seat, feet on the foot ring */}
        <Part geometry={parts.pelvis} color={jeans} noInk />
        {[-1, 1].map((side) => {
          const hip: Vec3 = [side * 0.082, SEAT_TOP + 0.086, 0.015]
          const knee: Vec3 = [side * 0.094, SEAT_TOP + 0.082, 0.4]
          const ankle: Vec3 = [side * 0.094, 0.355, 0.2]
          return (
            <group key={side}>
              <Limb from={hip} to={knee} radius={0.076} color={jeans} />
              <Limb from={knee} to={ankle} radius={0.054} color={jeans} />
              {/* sneakers, toes resting forward of the ring */}
              <Sph radius={0.05} position={[ankle[0], 0.298, 0.235]} scale={[0.88, 0.66, 1.6]} color={cream} segments={14} />
              <Sph radius={0.05} position={[ankle[0], 0.279, 0.235]} scale={[0.92, 0.28, 1.65]} color="#d8d1c4" segments={14} noInk />
            </group>
          )
        })}

        {/* neck */}
        <Cyl top={0.04} bottom={0.05} height={0.16} position={[0, 1.285, 0.012]} color="#e6bda2" noInk />

        {/* the sweater: breathes from the middle of her chest */}
        <group ref={chest} position={[0, CHEST_Y, 0]}>
          <group position={[0, -CHEST_Y, 0]}>
            <Part geometry={parts.torso} map={parts.knit} color={sweater} />
            <Torus radius={0.066} tube={0.0095} position={[0, 1.238, 0.012]} rotation={[Math.PI / 2 + 0.16, 0, 0]} scale={[1.08, 0.86, 1]} color="#dfd8cc" noInk />
          </group>
        </group>

        {/* arms reach down to the keyboard */}
        {[-1, 1].map((side) => {
          const shoulder: Vec3 = [side * 0.168, 1.168, 0.004]
          const elbow: Vec3 = [side * 0.222, 0.985, 0.235]
          const wrist: Vec3 = [side * 0.098, 1.067, 0.54]
          return (
            <group key={side}>
              <Limb from={shoulder} to={elbow} radius={0.058} color={sweater} />
              <Limb from={elbow} to={wrist} radius={0.049} color={sweater} />
              <Cyl radius={0.05} height={0.03} position={[side * 0.104, 1.064, 0.518]} rotation={[1.3, 0, side * 0.26]} color="#dfd8cc" noInk />
              <Hand side={side as -1 | 1} hand={(group) => void (hands.current[side < 0 ? 0 : 1] = group)} />
            </group>
          )
        })}
      </Inked>

      <Necklace />

      <group ref={head} position={HEAD_CENTER} scale={HEAD_SCALE}>
        <Inked>
          {/* tinted slightly, so her skin holds its color in direct sun */}
          {/* no cast shadows on the face: stripes of sun and hair shadow read as blotches, not as modeling */}
          <Part ref={face} geometry={parts.head} map={parts.face} color={FACE_TINT} receiveShadow={false} />
        </Inked>
        <Ear side={-1} />
        <Ear side={1} />
        <Spectacles />
      </group>

      {/* The hair turns itself in its shader, so it isn't a child of the head. */}
      {/* slightly narrower than the head's scale, so the hair frames her face instead of widening it */}
      <mesh ref={hair} geometry={parts.hair} material={parts.hairMat.material} position={HEAD_CENTER} scale={[HEAD_SCALE * 0.88, HEAD_SCALE, HEAD_SCALE]} castShadow receiveShadow />
    </group>
  )
}
