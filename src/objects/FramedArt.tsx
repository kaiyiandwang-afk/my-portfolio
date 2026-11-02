import { useMemo } from 'react'
import { LAYOUT, PALETTE } from '../config'
import type { Vec3 } from '../config'
import { SRGBColorSpace, TextureLoader } from 'three'
import { art } from '../content'
import { Box, Inked, Surface } from './prims'

const FRAMES: { offset: Vec3; size: [number, number] }[] = [
  { offset: [-0.2, 0.08, 0], size: [0.62, 0.8] },
  { offset: [0.37, 0.28, 0], size: [0.42, 0.42] },
  { offset: [0.37, -0.25, 0], size: [0.42, 0.52] },
]

const loader = new TextureLoader()

/** Three frames by the window, showing the first three images from content.ts. */
export function FramedArt() {
  const textures = useMemo(
    () =>
      FRAMES.map((_, i) => {
        const texture = loader.load(art.images[i % art.images.length].src)
        texture.colorSpace = SRGBColorSpace
        texture.anisotropy = 4
        return texture
      }),
    [],
  )

  return (
    <group position={LAYOUT.art.position}>
      {FRAMES.map(({ offset, size: [w, h] }, i) => (
        <group key={i} position={offset}>
          <Inked>
            <Box size={[w, h, 0.04]} position={[0, 0, 0.02]} color={PALETTE.frame} />
          </Inked>
          <mesh position={[0, 0, 0.042]} receiveShadow>
            <planeGeometry args={[w - 0.09, h - 0.09]} />
            <Surface map={textures[i]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
