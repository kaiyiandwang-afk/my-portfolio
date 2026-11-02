import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { LatheGeometry, Vector2 } from 'three'
import type { Group, Mesh } from 'three'
import { LAYOUT, PALETTE } from '../config'
import { useCafe } from '../state/store'
import { Box, Cyl, Inked, Limb, Part, RoundBox, Sph, Surface, makeCanvasTexture } from './prims'
import { Steam } from './Steam'

const CHROME = '#d8dbde'
const ENAMEL = '#b4412c'
const BAKELITE = '#1d1715'

function cupGeometry() {
  const profile: [number, number][] = [
    [0.001, 0],
    [0.026, 0],
    [0.028, 0.004],
    [0.043, 0.038],
    [0.046, 0.062],
    [0.043, 0.062],
    [0.04, 0.04],
    [0.024, 0.01],
    [0.001, 0.008],
  ]
  return new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), 20)
}

function Cup({ geometry }: { geometry: LatheGeometry }) {
  return (
    <>
      <Cyl top={0.058} bottom={0.044} height={0.006} position={[0, 0.003, 0]} segments={20} color={PALETTE.ceramic} noCast />
      <group position={[0, 0.006, 0]}>
        <Part geometry={geometry} color={PALETTE.ceramic} gloss />
        <Limb from={[0.044, 0.044, 0]} to={[0.06, 0.03, 0]} radius={0.0045} color={PALETTE.ceramic} />
      </group>
    </>
  )
}

/** A pressure gauge: a chrome bezel and a painted face. */
function Gauge({ position, reading }: { position: [number, number, number]; reading: number }) {
  const face = useMemo(
    () =>
      makeCanvasTexture(128, 128, (ctx, w) => {
        const c = w / 2
        ctx.fillStyle = '#f7f0e0'
        ctx.beginPath()
        ctx.arc(c, c, c, 0, 7)
        ctx.fill()
        ctx.strokeStyle = '#2a2430'
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5
          ctx.lineWidth = i % 5 ? 2 : 4
          ctx.beginPath()
          ctx.moveTo(c + Math.cos(a) * 42, c + Math.sin(a) * 42)
          ctx.lineTo(c + Math.cos(a) * 54, c + Math.sin(a) * 54)
          ctx.stroke()
        }
        // the working range
        ctx.strokeStyle = '#3f8a5c'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.arc(c, c, 36, Math.PI * 1.25, Math.PI * 1.7)
        ctx.stroke()
        const n = Math.PI * 0.75 + reading * Math.PI * 1.5
        ctx.strokeStyle = '#c0301f'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(c, c)
        ctx.lineTo(c + Math.cos(n) * 46, c + Math.sin(n) * 46)
        ctx.stroke()
        ctx.fillStyle = '#2a2430'
        ctx.beginPath()
        ctx.arc(c, c, 7, 0, 7)
        ctx.fill()
      }),
    [reading],
  )
  return (
    <group position={position}>
      <Cyl radius={0.037} height={0.012} rotation={[Math.PI / 2, 0, 0]} segments={22} color={CHROME} gloss noCast />
      <mesh position={[0, 0, 0.0065]}>
        <circleGeometry args={[0.031, 22]} />
        <Surface color="#ffffff" map={face} />
      </mesh>
    </group>
  )
}

/** One group head, with its portafilter locked in: chrome basket, double spout and a black bakelite handle. */
function GroupHead({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0.1]}>
      <Cyl top={0.06} bottom={0.052} height={0.04} position={[0, 0.3, 0]} segments={20} color={CHROME} gloss />
      <Cyl radius={0.05} height={0.03} position={[0, 0.266, 0]} segments={20} color={CHROME} gloss />
      {/* the handle, angled toward the barista */}
      <Limb from={[0, 0.264, 0.04]} to={[0, 0.25, 0.09]} radius={0.009} color={CHROME} />
      <Limb from={[0, 0.25, 0.09]} to={[0, 0.226, 0.2]} radius={0.016} color={BAKELITE} />
      <Sph radius={0.018} position={[0, 0.224, 0.205]} color={BAKELITE} segments={10} noCast noInk />
      {/* spouts */}
      <Cyl top={0.018} bottom={0.012} height={0.016} position={[0, 0.244, 0]} color={CHROME} noCast noInk />
      {[-1, 1].map((s) => (
        <Limb key={s} from={[0, 0.238, 0]} to={[s * 0.018, 0.222, 0]} radius={0.0048} color={CHROME} />
      ))}
    </group>
  )
}

function SteamWand({ side }: { side: -1 | 1 }) {
  return (
    <group>
      <Limb from={[side * 0.37, 0.33, 0.12]} to={[side * 0.4, 0.27, 0.17]} radius={0.0072} color={CHROME} />
      <Limb from={[side * 0.4, 0.27, 0.17]} to={[side * 0.42, 0.13, 0.22]} radius={0.0066} color={CHROME} />
      <Sph radius={0.0095} position={[side * 0.42, 0.127, 0.221]} scale={[1, 1.5, 1]} color={BAKELITE} segments={8} noCast noInk />
      {/* the steam knob, ribbed by a lathe of little ridges */}
      <Cyl radius={0.03} height={0.03} position={[side * 0.3, 0.385, 0.2]} rotation={[Math.PI / 2, 0, 0]} segments={14} color={BAKELITE} noCast />
      <Cyl radius={0.013} height={0.01} position={[side * 0.3, 0.385, 0.218]} rotation={[Math.PI / 2, 0, 0]} color={CHROME} gloss noCast noInk />
    </group>
  )
}

/** A heavy two-group lever-era machine: enamel and chrome, gauges, wands, a warming rail of cups. */
export function EspressoMachine() {
  const cup = useRef<Group>(null)
  const stream = useRef<Mesh>(null)
  const coffee = useRef<Mesh>(null)
  const burst = useRef(0)
  const parts = useMemo(() => {
    const grate = makeCanvasTexture(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#2b2d30'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#9da1a6'
      for (let x = 4; x < w; x += 16) ctx.fillRect(x, 5, 9, h - 10)
    })
    const plate = makeCanvasTexture(
      256,
      96,
      (ctx, w, h) => {
        ctx.fillStyle = '#c29a55'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = '#8a6a33'
        ctx.lineWidth = 4
        ctx.strokeRect(6, 6, w - 12, h - 12)
        ctx.fillStyle = '#3a2615'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '700 58px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", sans-serif'
        ctx.fillText('咖啡', w / 2, h / 2 + 3)
      },
      ['700 58px "Noto Sans SC"'],
    )
    return { grate, plate, cup: cupGeometry() }
  }, [])

  useFrame((_, delta) => {
    const { openSection, pouring, shots } = useCafe.getState()
    const open = openSection === 'work'
    if (cup.current) {
      const size = open ? 1 : 0.0001
      easing.damp3(cup.current.scale, [size, size, size], 0.14, delta)
    }
    // A hiss of steam as the section opens, then a thread for as long as it stays open.
    easing.damp(burst, 'current', open ? 0.22 : 0, open ? 1.6 : 0.3, delta)
    if (open && burst.current < 0.15) burst.current = 1
    if (stream.current) {
      easing.damp(stream.current.scale, 'x', pouring ? 1 : 0, 0.05, delta)
      easing.damp(stream.current.scale, 'z', pouring ? 1 : 0, 0.05, delta)
      stream.current.visible = stream.current.scale.x > 0.02
    }
    if (coffee.current) {
      const fill = Math.min(1, (shots + (pouring ? 1 : 0)) / 3)
      easing.damp(coffee.current.position, 'y', 0.018 + fill * 0.042, 0.3, delta)
      easing.damp3(coffee.current.scale, [0.72 + fill * 0.32, 1, 0.72 + fill * 0.32], 0.3, delta)
      coffee.current.visible = shots > 0 || pouring
    }
  })

  return (
    <group position={LAYOUT.espresso.position}>
      <Inked>
        {/* feet, base and drip tray */}
        {[-0.38, 0.38].map((x) =>
          [-0.17, 0.2].map((z) => <Cyl key={`${x}${z}`} top={0.024} bottom={0.018} height={0.02} position={[x, 0.01, z]} color={BAKELITE} noCast />),
        )}
        <RoundBox size={[0.88, 0.05, 0.46]} radius={0.016} position={[0, 0.043, 0]} color={CHROME} gloss />

        {/* the body: enamel between two chrome columns */}
        <RoundBox size={[0.82, 0.3, 0.2]} radius={0.02} position={[0, 0.2, -0.13]} color={ENAMEL} gloss />
        {[-0.42, 0.42].map((x) => (
          <RoundBox key={x} size={[0.05, 0.31, 0.24]} radius={0.016} position={[x, 0.205, -0.11]} color={CHROME} gloss />
        ))}

        {/* the head that carries everything */}
        <RoundBox size={[0.9, 0.135, 0.42]} radius={0.034} position={[0, 0.39, -0.02]} color={CHROME} gloss />
      </Inked>

      {/* drip tray grate */}
      <mesh position={[0, 0.0695, 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.78, 0.3]} />
        <Surface color="#ffffff" map={parts.grate} />
      </mesh>

      {/* an enamel band and pinstripes across the head */}
      <Box size={[0.86, 0.008, 0.004]} position={[0, 0.435, 0.192]} color={ENAMEL} noCast noInk />
      <Box size={[0.86, 0.008, 0.004]} position={[0, 0.34, 0.192]} color={ENAMEL} noCast noInk />

      <mesh position={[0, 0.388, 0.1935]}>
        <planeGeometry args={[0.12, 0.045]} />
        <Surface color="#ffffff" map={parts.plate} />
      </mesh>

      <Gauge position={[-0.13, 0.388, 0.195]} reading={0.56} />
      <Gauge position={[0.13, 0.388, 0.195]} reading={0.42} />

      {/* brew buttons above each group, softly lit */}
      {[-0.2, 0.2].map((x) =>
        [-0.02, 0.02].map((dx, i) => (
          <Sph key={`${x}${dx}`} radius={0.0075} position={[x + dx - (x < 0 ? 0.015 : -0.015) * 3, 0.42, 0.193]} scale={[1, 1, 0.5]} color={i ? '#ffd27a' : '#ff9b52'} emissive={i ? '#ffd27a' : '#ff9b52'} emissiveIntensity={1.4} segments={8} noCast noInk />
        )),
      )}

      <Inked>
        <GroupHead x={-0.2} />
        <GroupHead x={0.2} />
      </Inked>
      <SteamWand side={-1} />
      <SteamWand side={1} />
      <Steam position={[0.42, 0.13, 0.22]} width={0.26} height={0.5} strength={() => burst.current} seed={2.2} />

      {/* the coffee pulling when the visitor asks for a shot */}
      <mesh ref={stream} position={[-0.2, 0.15, 0.1]} scale={[0, 1, 0]} visible={false}>
        <cylinderGeometry args={[0.0042, 0.0034, 0.14, 8]} />
        <Surface color="#4a2a18" />
      </mesh>

      {/* the cup that appears under the group head when Work opens */}
      <group ref={cup} position={[-0.2, 0.07, 0.1]} scale={0.0001}>
        <Cup geometry={parts.cup} />
        <mesh ref={coffee} position={[0, 0.018, 0]} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.04, 18]} />
          <Surface color="#b98348" />
        </mesh>
      </group>

      {/* the warming rail and its cups */}
      <Inked>
        {[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <group key={x} position={[x, 0.458, -0.02]}>
            <Part geometry={parts.cup} color={PALETTE.ceramic} gloss />
          </group>
        ))}
      </Inked>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Limb from={[side * 0.42, 0.46, -0.2]} to={[side * 0.42, 0.53, -0.2]} radius={0.0065} color={CHROME} />
          <Limb from={[side * 0.42, 0.46, 0.15]} to={[side * 0.42, 0.53, 0.15]} radius={0.0065} color={CHROME} />
          <Limb from={[side * 0.42, 0.53, -0.2]} to={[side * 0.42, 0.53, 0.15]} radius={0.0065} color={CHROME} />
        </group>
      ))}
      <Limb from={[-0.42, 0.53, -0.2]} to={[0.42, 0.53, -0.2]} radius={0.0065} color={CHROME} />
      <Limb from={[-0.42, 0.53, 0.15]} to={[0.42, 0.53, 0.15]} radius={0.0065} color={CHROME} />
    </group>
  )
}
