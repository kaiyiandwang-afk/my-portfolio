import { useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Color, Object3D } from 'three'
import type { InstancedMesh } from 'three'
import { PALETTE } from '../config'
import { toonMaterial } from '../shaders/toon'
import { seeded } from './prims'

let leaf: BufferGeometry | null = null

/** One pointed leaf, spine along +Y and folded slightly along it, so the toon ramp catches two tones. */
export function leafGeometry() {
  if (leaf) return leaf
  const rows = [
    { y: 0, w: 0, bend: 0 },
    { y: 0.2, w: 0.24, bend: 0.02 },
    { y: 0.45, w: 0.32, bend: 0.06 },
    { y: 0.72, w: 0.22, bend: 0.13 },
    { y: 1, w: 0, bend: 0.24 },
  ]
  const positions: number[] = []
  const indices: number[] = []
  rows.forEach(({ y, w, bend }) => {
    positions.push(-w, y, bend - w * 0.28) // left edge
    positions.push(0, y, bend) // spine
    positions.push(w, y, bend - w * 0.28) // right edge
  })
  for (let r = 0; r < rows.length - 1; r++) {
    const a = r * 3
    const b = a + 3
    indices.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1)
  }
  leaf = new BufferGeometry()
  leaf.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  leaf.setIndex(indices)
  leaf.computeVertexNormals()
  return leaf
}

interface FoliageProps {
  count: number
  seed: number
  /** Leaf length. */
  size?: number
  /** How far leaf bases scatter from the stem. */
  radius?: number
  /** How high the bases climb. */
  height?: number
  /** Leaf tilt from straight up, in radians. Past π/2 they hang down. */
  tilt?: [number, number]
}

/** An instanced clump of real leaf shapes. Reads far better than the greybox's blobs and costs one draw call. */
export function Foliage({ count, seed, size = 0.42, radius = 0.1, height = 0.5, tilt = [0.25, 1.35] }: FoliageProps) {
  const ref = useRef<InstancedMesh>(null)
  const material = useMemo(() => toonMaterial({ doubleSided: true }), [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = seeded(seed)
    const dummy = new Object3D()
    const colors = [new Color(PALETTE.plant), new Color(PALETTE.plantDark), new Color(PALETTE.plantLight)]
    dummy.rotation.order = 'YXZ'
    for (let i = 0; i < count; i++) {
      const azimuth = rand() * Math.PI * 2
      const r = radius * rand()
      dummy.position.set(Math.cos(azimuth) * r, height * rand(), Math.sin(azimuth) * r)
      dummy.rotation.set(tilt[0] + rand() * (tilt[1] - tilt[0]), azimuth + (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.5)
      dummy.scale.setScalar(size * (0.7 + rand() * 0.6))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      const roll = rand()
      mesh.setColorAt(i, colors[roll < 0.5 ? 0 : roll < 0.82 ? 1 : 2])
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [count, seed, size, radius, height, tilt])

  return <instancedMesh ref={ref} args={[leafGeometry(), material, count]} castShadow receiveShadow />
}
