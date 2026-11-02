import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { MeshToonMaterial } from 'three'
import { dusk } from '../state/dayNight'

/** Fades a shared material's glow with the time of day. Every mesh using that material follows along. */
export function NightGlow({ material, day, night }: { material: MeshToonMaterial; day: number; night: number }) {
  useFrame(() => {
    material.emissiveIntensity = MathUtils.lerp(day, night, dusk.night)
  })
  return null
}
