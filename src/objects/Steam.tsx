import { useMemo } from 'react'
import type { ComponentProps } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { Color, ShaderMaterial } from 'three'
import { steamFragment, steamVertex } from '../shaders/steam'

interface SteamProps extends ComponentProps<typeof Billboard> {
  width: number
  height: number
  /** How much there is, 0 to 1. A function is read every frame, for bursts. */
  strength?: number | (() => number)
  seed?: number
  color?: string
}

/** A column of steam rising from its base, always turned to the camera but staying upright. */
export function Steam({ width, height, strength = 1, seed = 0, color = '#fff6ea', ...props }: SteamProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: steamVertex,
        fragmentShader: steamFragment,
        uniforms: {
          uTime: { value: 0 },
          uStrength: { value: 0 },
          uSeed: { value: seed },
          uColor: { value: new Color(color) },
        },
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    [seed, color],
  )

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    material.uniforms.uStrength.value = typeof strength === 'function' ? strength() : strength
  })

  return (
    <Billboard lockX lockZ {...props}>
      <mesh position={[0, height / 2, 0]} material={material} renderOrder={6} userData={{ noOutline: true }}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </Billboard>
  )
}
