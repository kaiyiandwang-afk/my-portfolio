import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { CatmullRomCurve3, Color, LatheGeometry, MeshBasicMaterial, TubeGeometry, Vector2, Vector3 } from 'three'
import type { Group } from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { LAYOUT, PALETTE } from '../config'
import { brothFragment, brothVertex } from '../shaders/broth'
import { dusk } from '../state/dayNight'
import { useCafe } from '../state/store'
import { Box, Cyl, Inked, Limb, Part, RoundBox, Sph, Torus } from './prims'
import { Steam } from './Steam'

const TABLE_TOP = 0.74

const INGREDIENTS = [
  { color: '#f8f1e2', scale: [1, 0.72, 1], radius: 0.036 }, // dumpling
  { color: '#6fa853', scale: [1.3, 0.34, 0.8], radius: 0.046 }, // bok choy
  { color: '#f3a9a0', scale: [1, 0.38, 1], radius: 0.032 }, // fish cake
  { color: '#fff4c2', scale: [1, 1.14, 1], radius: 0.03 }, // soft egg
  { color: '#8a5a3c', scale: [1.1, 0.62, 1.1], radius: 0.032 }, // mushroom
  { color: '#f2e6c8', scale: [1, 0.8, 0.8], radius: 0.034 }, // tofu
  { color: '#ff9d6c', scale: [1.3, 0.56, 0.7], radius: 0.032 }, // prawn
]

/** Each interest rides up out of the broth on its own ingredient. */
function RisingIngredients() {
  const group = useRef<Group>(null)
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const { openSection, focus, hoveredInterest } = useCafe.getState()
    const open = openSection === 'interests' && focus === 'hotpot'
    group.current.children.forEach((child, i) => {
      const anchor = LAYOUT.hotpotPills[i]
      const picked = hoveredInterest === i
      const bob = open ? Math.sin(clock.elapsedTime * (picked ? 5 : 1.7) + i * 1.3) * (picked ? 0.022 : 0.009) + (picked ? 0.03 : 0) : 0
      // staggered, so they surface one after another
      const smooth = open ? 0.26 + i * 0.05 : 0.14
      easing.damp3(child.position, open ? [anchor[0], anchor[1] + bob, anchor[2]] : [anchor[0] * 0.28, 0.1, anchor[2] * 0.3], smooth, delta)
      const size = open ? (picked ? 1.45 : 1) : 0.0001
      easing.damp3(child.scale, [size, size, size], smooth, delta)
    })
  })
  return (
    <group ref={group}>
      {INGREDIENTS.map(({ color, scale, radius }, i) => (
        <group key={i} scale={0.0001}>
          <Sph radius={radius} scale={scale as [number, number, number]} color={color} segments={12} noCast />
        </group>
      ))}
    </group>
  )
}

const POT_LIP = 0.125
const BROTH_Y = 0.1
const BROTH_RADIUS = 0.258

/** Copper, spun on a lathe: outer wall, a rolled lip, and the inside falling away to the broth. */
function potGeometry() {
  const profile: [number, number][] = [
    [0.001, 0],
    [0.19, 0],
    [0.215, 0.008],
    [0.25, 0.05],
    [0.272, 0.1],
    [0.281, POT_LIP - 0.008],
    [0.286, POT_LIP],
    [0.281, POT_LIP + 0.006],
    [0.27, POT_LIP + 0.004],
    [0.262, POT_LIP - 0.006],
    [BROTH_RADIUS, BROTH_Y - 0.01],
  ]
  return new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), 40)
}

function bowlGeometry() {
  const profile: [number, number][] = [
    [0.001, 0],
    [0.035, 0],
    [0.037, 0.007],
    [0.052, 0.013],
    [0.08, 0.048],
    [0.083, 0.054],
    [0.078, 0.054],
    [0.05, 0.02],
    [0.001, 0.014],
  ]
  return new LatheGeometry(profile.map(([x, y]) => new Vector2(x, y)), 24)
}

/** Follows the S the shader draws between the two broths. */
function dividerGeometry() {
  const points = Array.from({ length: 13 }, (_, i) => {
    const t = (i / 12) * 2 - 1
    return new Vector3(-Math.sin(t * Math.PI) * 0.28 * BROTH_RADIUS, 0, -t * BROTH_RADIUS * 0.985)
  })
  return new TubeGeometry(new CatmullRomCurve3(points), 40, 0.0045, 6)
}

function Broth() {
  const uniforms = useMemo(
    () => ({
      uRadius: { value: BROTH_RADIUS },
      uTime: { value: 0 },
      uNight: { value: 0 },
      uRed: { value: new Color('#d8431c') },
      uRedDeep: { value: new Color('#a82a12') },
      uOil: { value: new Color('#ff9a3c') },
      uMilk: { value: new Color('#f6e8cc') },
      uMilkDeep: { value: new Color('#e6cf9f') },
    }),
    [],
  )
  useFrame((_, delta) => {
    uniforms.uTime.value += delta
    uniforms.uNight.value = dusk.night
  })
  return (
    <mesh position={[0, BROTH_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ noOutline: true }}>
      <circleGeometry args={[BROTH_RADIUS, 48]} />
      <CustomShaderMaterial baseMaterial={MeshBasicMaterial} vertexShader={brothVertex} fragmentShader={brothFragment} uniforms={uniforms} fog={false} />
    </mesh>
  )
}

/** What's cooking: each piece rides the simmer at its own pace. Red side at -X, milky side at +X. */
const FLOATING: { position: [number, number]; kind: 'ball' | 'tofu' | 'mushroom' | 'chili' | 'leaf' | 'scallion' | 'goji' | 'lotus'; turn: number }[] = [
  { position: [-0.15, 0.08], kind: 'chili', turn: 0.4 },
  { position: [-0.19, -0.05], kind: 'chili', turn: 2.1 },
  { position: [-0.09, -0.15], kind: 'chili', turn: 1.1 },
  { position: [-0.12, 0.17], kind: 'lotus', turn: 0.2 },
  { position: [-0.19, 0.03], kind: 'scallion', turn: 0 },
  { position: [-0.05, -0.05], kind: 'ball', turn: 0 },
  { position: [-0.1, -0.03], kind: 'mushroom', turn: 0.8 },
  { position: [0.13, -0.11], kind: 'tofu', turn: 0.5 },
  { position: [0.18, 0.04], kind: 'tofu', turn: 1.2 },
  { position: [0.09, 0.14], kind: 'leaf', turn: -0.6 },
  { position: [0.06, -0.19], kind: 'mushroom', turn: 2.2 },
  { position: [0.17, -0.02], kind: 'goji', turn: 0 },
  { position: [0.03, 0.05], kind: 'goji', turn: 0 },
  { position: [0.11, 0.03], kind: 'ball', turn: 0 },
]

function Floating({ kind }: { kind: (typeof FLOATING)[number]['kind'] }) {
  switch (kind) {
    case 'ball':
      return <Sph radius={0.024} scale={[1, 0.9, 1]} color="#fbf3e2" segments={12} noCast noInk />
    case 'tofu':
      return <RoundBox size={[0.05, 0.026, 0.05]} radius={0.006} color="#fff3d2" noCast noInk />
    case 'mushroom':
      return (
        <>
          <Sph radius={0.024} scale={[1, 0.5, 1]} color="#7a4f35" segments={12} noCast noInk />
          <Cyl radius={0.006} height={0.012} position={[0, -0.01, 0]} color="#ead8b8" noCast noInk />
        </>
      )
    case 'chili':
      return <Limb from={[-0.022, 0, 0]} to={[0.022, 0.002, 0.006]} radius={0.0065} color="#c21f12" />
    case 'leaf':
      return (
        <>
          <Sph radius={0.042} scale={[1.1, 0.14, 0.7]} color="#5e9a3f" segments={10} noCast noInk />
          <Sph radius={0.03} position={[-0.02, 0.006, 0]} scale={[1.1, 0.2, 0.42]} color="#dfeeb8" segments={8} noCast noInk />
        </>
      )
    case 'scallion':
      return (
        <>
          <Torus radius={0.009} tube={0.003} position={[0.012, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]} color="#7fb84d" noCast noInk />
          <Torus radius={0.009} tube={0.003} position={[-0.012, 0.001, 0.01]} rotation={[Math.PI / 2, 0, 0]} color="#8ec25a" noCast noInk />
        </>
      )
    case 'goji':
      return <Sph radius={0.009} scale={[1.3, 0.8, 0.9]} color="#d6321f" segments={8} noCast noInk />
    case 'lotus':
      return (
        <>
          <Cyl radius={0.03} height={0.008} segments={14} color="#f3e6c6" noCast noInk />
          {[0, 1, 2, 3, 4].map((i) => (
            <Cyl key={i} radius={0.0058} height={0.009} position={[Math.cos(i * 1.257) * 0.017, 0, Math.sin(i * 1.257) * 0.017]} color="#b89a68" noCast noInk />
          ))}
        </>
      )
  }
}

function SimmeringFood() {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime
    group.current.children.forEach((child, i) => {
      const [x, z] = FLOATING[i].position
      child.position.set(x + Math.sin(t * 0.21 + i * 1.7) * 0.006, BROTH_Y + 0.006 + Math.sin(t * 1.5 + i * 2.3) * 0.0028, z + Math.cos(t * 0.17 + i) * 0.006)
      child.rotation.y = FLOATING[i].turn + Math.sin(t * 0.13 + i) * 0.25
    })
  })
  return (
    <group ref={group}>
      {FLOATING.map(({ kind }, i) => (
        <group key={i}>
          <Floating kind={kind} />
        </group>
      ))}
    </group>
  )
}

/** A low flame under the pot: most of what it does shows after dark. */
function BurnerFlame() {
  const ring = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ring.current) return
    ring.current.scale.y = 1 + Math.sin(clock.elapsedTime * 17) * 0.1 + Math.sin(clock.elapsedTime * 29) * 0.08
  })
  return (
    <group ref={ring} position={[0, TABLE_TOP + 0.05, 0]}>
      <Torus radius={0.125} tube={0.006} rotation={[Math.PI / 2, 0, 0]} color="#3f7dff" emissive="#4b8cff" emissiveIntensity={3.4} noCast noInk />
      <Torus radius={0.078} tube={0.005} rotation={[Math.PI / 2, 0, 0]} color="#ffb14d" emissive="#ff9a3c" emissiveIntensity={2.6} noCast noInk />
    </group>
  )
}

function PlaceSetting({ x, z, turn }: { x: number; z: number; turn: number }) {
  const bowl = useMemo(bowlGeometry, [])
  return (
    <group position={[x, TABLE_TOP, z]} rotation={[0, turn, 0]}>
      <Inked>
        <Part geometry={bowl} color={PALETTE.ceramic} gloss />
      </Inked>
      <Cyl radius={0.05} height={0.003} position={[0, 0.03, 0]} color="#e0a15b" noCast noInk />
      {/* blue rim line, as on everyday Chinese ware */}
      <Torus radius={0.081} tube={0.0014} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} color="#5570a8" noCast noInk />
      {/* chopsticks on their rest */}
      <RoundBox size={[0.03, 0.012, 0.02]} radius={0.004} position={[0.115, 0.006, -0.05]} color="#b23a2c" noCast noInk />
      {[-0.008, 0.008].map((offset) => (
        <Limb key={offset} from={[0.11 + offset, 0.015, -0.1]} to={[0.12 + offset * 1.5, 0.008, 0.11]} radius={0.0032} color="#3a2318" />
      ))}
    </group>
  )
}

/** Small round table with a two-flavor hotpot at a slow simmer. */
export function Hotpot() {
  const pot = useMemo(potGeometry, [])
  const divider = useMemo(dividerGeometry, [])
  return (
    <group position={LAYOUT.hotpot.position}>
      <Inked>
        {/* table */}
        <Cyl radius={0.54} height={0.045} segments={40} position={[0, TABLE_TOP - 0.022, 0]} color={PALETTE.wood} />
        <Cyl radius={0.03} height={TABLE_TOP - 0.05} position={[0, (TABLE_TOP - 0.05) / 2, 0]} color={PALETTE.iron} />
        <Cyl radius={0.26} height={0.025} segments={24} position={[0, 0.012, 0]} color={PALETTE.iron} />

        {/* the burner: a low stand with the pot sitting up on it, so the flame can show */}
        <Cyl top={0.17} bottom={0.2} height={0.03} segments={28} position={[0, TABLE_TOP + 0.015, 0]} color={PALETTE.iron} />
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} size={[0.18, 0.018, 0.012]} position={[Math.cos(i * 1.5708) * 0.09, TABLE_TOP + 0.05, Math.sin(i * 1.5708) * 0.09]} rotation={[0, -i * 1.5708, 0]} color={PALETTE.iron} noCast />
        ))}
      </Inked>
      <BurnerFlame />

      <group position={[0, TABLE_TOP + 0.058, 0]}>
        <Inked>
          <Part geometry={pot} color={PALETTE.copper} gloss doubleSided />
          {/* ring handles, in their lugs */}
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.3, 0.092, 0]}>
              <Torus radius={0.038} tube={0.0075} rotation={[0, Math.PI / 2, 0]} color={PALETTE.brass} gloss />
              <RoundBox size={[0.03, 0.024, 0.03]} radius={0.006} position={[side * -0.02, 0.022, 0]} color={PALETTE.brass} gloss noCast />
            </group>
          ))}
        </Inked>
        <Broth />
        <Part geometry={divider} position={[0, BROTH_Y + 0.003, 0]} color="#c9c4bb" gloss noCast noInk />
        <SimmeringFood />
        <RisingIngredients />
        {/* a wisp from each side of the divider */}
        <Steam position={[-0.1, BROTH_Y + 0.02, 0.02]} width={0.42} height={0.68} strength={0.46} seed={1.3} />
        <Steam position={[0.11, BROTH_Y + 0.02, -0.03]} width={0.38} height={0.62} strength={0.38} seed={4.7} />
      </group>

      <PlaceSetting x={-0.34} z={0.26} turn={0.5} />
      <PlaceSetting x={0.34} z={-0.26} turn={3.4} />

      {/* low stools */}
      <Inked>
        {[
          [-0.84, -0.14],
          [0.76, -0.34],
        ].map(([x, z]) => (
          <group key={x} position={[x, 0, z]}>
            <Cyl radius={0.17} height={0.05} position={[0, 0.44, 0]} color={PALETTE.woodLight} />
            <Cyl radius={0.03} height={0.42} position={[0, 0.21, 0]} color={PALETTE.iron} />
          </group>
        ))}
      </Inked>
    </group>
  )
}
