import { LAYOUT, PALETTE } from '../config'
import type { Vec3 } from '../config'
import { useCafe } from '../state/store'
import { Box, Cyl, Inked, Limb, Sph, Torus } from './prims'
import { Steam } from './Steam'

function Mug() {
  return (
    <group position={LAYOUT.mug.position}>
      <Cyl top={0.052} bottom={0.046} height={0.11} position={[0, 0.055, 0]} color={PALETTE.mugGlaze} gloss />
      <Torus radius={0.033} tube={0.009} position={[0.058, 0.056, 0]} color={PALETTE.mugGlaze} gloss />
      <Cyl radius={0.045} height={0.004} position={[0, 0.108, 0]} color={PALETTE.woodDark} noCast noInk />
      <Steam position={[0, 0.11, 0]} width={0.14} height={0.34} strength={0.5} seed={8.1} />
    </group>
  )
}

/** Like reference 4: a jointed arm and a cone shade, angled toward the keyboard. */
export function DeskLamp() {
  const { position, rotationY } = LAYOUT.lamp
  const lampOn = useCafe((s) => s.lampOn)
  const base: Vec3 = [0, 0.03, 0]
  const elbow: Vec3 = [0.06, 0.46, -0.06]
  const head: Vec3 = [0.3, 0.6, 0]
  return (
    <Inked>
    <group position={position} rotation={[0, rotationY, 0]}>
      <Cyl top={0.09} bottom={0.1} height={0.03} position={[0, 0.015, 0]} color={PALETTE.brass} />
      <Limb from={base} to={elbow} radius={0.012} color={PALETTE.brass} />
      <Limb from={elbow} to={head} radius={0.012} color={PALETTE.brass} />
      <group position={[0.32, 0.55, 0]} rotation={[0, 0, 0.5]}>
        <Cyl top={0.05} bottom={0.14} height={0.15} segments={18} color={PALETTE.plantDark} />
        <Sph radius={0.04} position={[0, -0.06, 0]} color={PALETTE.bulb} emissive={PALETTE.bulb} emissiveIntensity={lampOn ? 8 : 0} noCast noInk />
      </group>
    </group>
    </Inked>
  )
}

function BookStack() {
  const stack = [
    { size: [0.34, 0.05, 0.26] as Vec3, color: PALETTE.books[7], turn: 0.05 },
    { size: [0.32, 0.045, 0.25] as Vec3, color: PALETTE.books[4], turn: -0.08 },
    { size: [0.3, 0.05, 0.23] as Vec3, color: PALETTE.books[0], turn: 0.12 },
    { size: [0.27, 0.04, 0.21] as Vec3, color: PALETTE.books[3], turn: -0.04 },
  ]
  let y = 0
  return (
    <group position={LAYOUT.books.position} rotation={[0, 0.3, 0]}>
      {stack.map(({ size, color, turn }) => {
        y += size[1]
        return <Box key={color} size={size} position={[0, y - size[1] / 2, 0]} rotation={[0, turn, 0]} color={color} />
      })}
    </group>
  )
}

export function DeskProps() {
  return (
    <Inked>
      <Mug />
      <BookStack />
    </Inked>
  )
}
