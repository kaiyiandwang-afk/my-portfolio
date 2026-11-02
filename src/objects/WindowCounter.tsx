import { Instance, Instances } from '@react-three/drei'
import { COUNTER, LAYOUT, PALETTE } from '../config'
import { plankTexture } from '../shaders/paint'
import { Box, Surface } from './prims'

const SEAT_HEIGHT = 0.72

/** The long window counter, plus every stool in the café (instanced). */
export function WindowCounter() {
  const { centerX, depth, topY, thickness, zMin, zMax } = COUNTER
  const length = zMax - zMin
  const centerZ = (zMax + zMin) / 2

  return (
    <group>
      <Box size={[depth, thickness, length]} position={[centerX, topY - thickness / 2, centerZ]} map={plankTexture('counter')} />
      {/* recessed panel leaves knee room */}
      <Box
        size={[0.18, topY - thickness, length]}
        position={[centerX + 0.28, (topY - thickness) / 2, centerZ]}
        color={PALETTE.woodDark}
      />
      <Stools />
    </group>
  )
}

function Stools() {
  const stools = [...LAYOUT.stools.counter, ...LAYOUT.stools.bar]
  const legs = stools.flatMap(([x, , z]) =>
    [0.785, 2.356, 3.927, 5.498].map((a) => ({
      position: [x + Math.cos(a) * 0.13, SEAT_HEIGHT / 2 - 0.02, z + Math.sin(a) * 0.13] as const,
      rotation: [Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09] as const,
    })),
  )

  return (
    <group>
      <Instances limit={stools.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.19, 0.05, 20]} />
        <Surface color={PALETTE.woodLight} />
        {stools.map(([x, , z], i) => (
          <Instance key={i} position={[x, SEAT_HEIGHT, z]} />
        ))}
      </Instances>
      <Instances limit={legs.length} castShadow>
        <cylinderGeometry args={[0.014, 0.014, SEAT_HEIGHT, 6]} />
        <Surface color={PALETTE.iron} />
        {legs.map((leg, i) => (
          <Instance key={i} position={[...leg.position]} rotation={[...leg.rotation]} />
        ))}
      </Instances>
      <Instances limit={stools.length} castShadow>
        <torusGeometry args={[0.145, 0.009, 6, 20]} />
        <Surface color={PALETTE.iron} />
        {stools.map(([x, , z], i) => (
          <Instance key={i} position={[x, 0.26, z]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
      </Instances>
    </group>
  )
}
