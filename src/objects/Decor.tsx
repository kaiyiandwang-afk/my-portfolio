import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { BACK_BAR, LAYOUT, NIGHT, PALETTE, ROOM } from '../config'
import type { Vec3 } from '../config'
import { useLook } from '../state/look'
import { toonMaterial } from '../shaders/toon'
import { Foliage } from './Foliage'
import { NightGlow } from './NightGlow'
import { Box, Cyl, Inked, Sph, Surface, makeCanvasTexture, seeded } from './prims'

function Pendant({ position, kind }: { position: readonly [number, number, number]; kind: 'edison' | 'shade' }) {
  const glow = useLook((s) => s.bulbGlow)
  const cord = ROOM.ceilingY - position[1]
  // the same cached material the bulb below is drawn with
  const bulb = toonMaterial({ color: PALETTE.bulb, emissive: PALETTE.bulb, emissiveIntensity: glow })
  return (
    <group position={[position[0], position[1], position[2]]}>
      <NightGlow material={bulb} day={0} night={glow} />
      <Cyl radius={0.006} height={cord} segments={5} position={[0, cord / 2, 0]} color={PALETTE.ink} noCast />
      {kind === 'edison' ? (
        <>
          <Cyl radius={0.022} height={0.05} position={[0, 0.025, 0]} color={PALETTE.brass} noCast />
          <Sph radius={0.052} position={[0, -0.04, 0]} scale={[1, 1.3, 1]} color={PALETTE.bulb} emissive={PALETTE.bulb} emissiveIntensity={glow} noCast />
        </>
      ) : (
        <>
          <Inked>
            <Cyl top={0.04} bottom={0.2} height={0.17} position={[0, -0.04, 0]} color={PALETTE.iron} />
          </Inked>
          <Sph radius={0.05} position={[0, -0.11, 0]} color={PALETTE.bulb} emissive={PALETTE.bulb} emissiveIntensity={glow} noCast />
        </>
      )}
    </group>
  )
}

function PottedPlant({ position, scale, seed }: { position: Vec3; scale: number; seed: number }) {
  return (
    <group position={position} scale={scale}>
      <Inked>
        <Cyl top={0.19} bottom={0.14} height={0.32} position={[0, 0.16, 0]} color={PALETTE.terracotta} />
      </Inked>
      <group position={[0, 0.3, 0]}>
        <Foliage count={34} seed={seed} size={0.44} radius={0.13} height={0.55} tilt={[0.15, 1.35]} />
      </group>
    </group>
  )
}

function HangingPlant({ position, seed }: { position: Vec3; seed: number }) {
  const cord = ROOM.ceilingY - position[1]
  return (
    <group position={position}>
      <Cyl radius={0.006} height={cord} segments={5} position={[0, cord / 2, 0]} color={PALETTE.ink} noCast />
      <Inked>
        <Cyl top={0.17} bottom={0.1} height={0.16} position={[0, -0.08, 0]} color={PALETTE.ceramic} />
      </Inked>
      <group position={[0, -0.04, 0]}>
        <Foliage count={46} seed={seed} size={0.42} radius={0.15} height={0.12} tilt={[0.9, 2.5]} />
      </group>
    </group>
  )
}

/** Jars on the shelves above the corkboard and along the back counter (instanced). */
function Jars() {
  const all = useMemo(() => {
    const rand = seeded(5)
    const makeJar = (x: number, y: number, z: number) => {
      const h = 0.11 + rand() * 0.09
      return {
        position: [x, y + h / 2, z] as Vec3,
        scale: [0.055 + rand() * 0.02, h, 0.055 + rand() * 0.02] as Vec3,
        color: PALETTE.jars[Math.floor(rand() * PALETTE.jars.length)],
      }
    }
    const [sx, sy, sz] = LAYOUT.jarShelves.position
    const shelfJars = [0, 0.42].flatMap((dy, level) =>
      Array.from({ length: 7 }, (_, i) => makeJar(sx - 0.46 + i * 0.145 + (level ? 0.02 : 0), sy + dy + 0.02, sz)),
    )
    const barJars = Array.from({ length: 16 }, (_, i) =>
      makeJar(BACK_BAR.xMax - 0.16 - i * 0.2, BACK_BAR.height, BACK_BAR.centerZ - 0.04),
    )
    return [...shelfJars, ...barJars]
  }, [])

  return (
    <Instances limit={all.length} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1, 1, 12]} />
      <Surface />
      {all.map((jar, i) => (
        <Instance key={i} position={jar.position} scale={jar.scale} color={jar.color} />
      ))}
    </Instances>
  )
}

function JarShelves() {
  const [x, y, z] = LAYOUT.jarShelves.position
  return (
    <Inked>
      {[0, 0.42].map((dy) => (
        <Box key={dy} size={[1.14, 0.035, 0.2]} position={[x, y + dy, z]} color={PALETTE.wood} />
      ))}
    </Inked>
  )
}

function Lantern() {
  const { position } = LAYOUT.lantern
  const cord = ROOM.ceilingY - position[1]
  return (
    <group position={position}>
      <NightGlow material={toonMaterial({ color: PALETTE.lantern, emissive: PALETTE.lantern, emissiveIntensity: 0.42 })} day={0.1} night={NIGHT.lanternGlow} />
      <Cyl radius={0.005} height={cord} segments={5} position={[0, cord / 2, 0]} color={PALETTE.ink} noCast />
      <Inked>
        <Sph radius={0.21} scale={[1, 0.82, 1]} color={PALETTE.lantern} emissive={PALETTE.lantern} emissiveIntensity={0.42} />
        <Cyl radius={0.075} height={0.03} position={[0, 0.17, 0]} color={PALETTE.brass} noCast />
        <Cyl radius={0.075} height={0.03} position={[0, -0.17, 0]} color={PALETTE.brass} noCast />
      </Inked>
      <Cyl radius={0.012} height={0.2} position={[0, -0.28, 0]} color={PALETTE.lantern} noCast />
    </group>
  )
}

function PlumVase() {
  const blossoms = useMemo(() => {
    const rand = seeded(17)
    return Array.from({ length: 14 }, (_, i) => {
      const t = i / 13
      return [(rand() - 0.5) * 0.22 + t * 0.1, 0.18 + t * 0.55, (rand() - 0.5) * 0.14] as Vec3
    })
  }, [])

  return (
    <group position={LAYOUT.plumVase.position}>
      <Inked>
        <Cyl top={0.04} bottom={0.06} height={0.2} position={[0, 0.1, 0]} color={PALETTE.ceramic} />
      </Inked>
      <Cyl radius={0.006} height={0.62} segments={5} position={[0.03, 0.48, 0]} rotation={[0, 0, -0.14]} color={PALETTE.woodDark} noCast />
      <Instances limit={blossoms.length}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <Surface color={PALETTE.plum} />
        {blossoms.map((position, i) => (
          <Instance key={i} position={position} />
        ))}
      </Instances>
    </group>
  )
}

function CalligraphyScroll() {
  const texture = useMemo(
    () =>
      makeCanvasTexture(96, 384, (ctx, w, h) => {
        ctx.fillStyle = PALETTE.paper
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = PALETTE.ink
        for (let i = 0; i < 4; i++) {
          const y = 60 + i * 76
          ctx.fillRect(w / 2 - 20, y, 40, 6)
          ctx.fillRect(w / 2 - 3, y - 18, 6, 44)
        }
      }),
    [],
  )
  return (
    <group position={LAYOUT.scroll.position}>
      <mesh position={[0, 0, 0.01]} receiveShadow>
        <planeGeometry args={[0.26, 1.1]} />
        <Surface map={texture} />
      </mesh>
      <Cyl radius={0.012} height={0.32} position={[0, 0.56, 0.012]} rotation={[0, 0, Math.PI / 2]} color={PALETTE.woodDark} noCast />
      <Cyl radius={0.012} height={0.32} position={[0, -0.56, 0.012]} rotation={[0, 0, Math.PI / 2]} color={PALETTE.woodDark} noCast />
    </group>
  )
}

export function Decor() {
  return (
    <group>
      {LAYOUT.pendants.map(({ position, kind }) => (
        <Pendant key={position.join()} position={position} kind={kind} />
      ))}
      {LAYOUT.hangingPlants.map((position, i) => (
        <HangingPlant key={i} position={position} seed={41 + i} />
      ))}
      {LAYOUT.floorPlants.map(({ position, scale }, i) => (
        <PottedPlant key={i} position={position} scale={scale} seed={61 + i} />
      ))}
      {LAYOUT.counterPlants.map(({ position, scale }, i) => (
        <PottedPlant key={i} position={position} scale={scale} seed={81 + i} />
      ))}
      <JarShelves />
      <Jars />
      <Lantern />
      <PlumVase />
      <CalligraphyScroll />
    </group>
  )
}
