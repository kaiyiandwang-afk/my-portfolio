import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshBasicMaterial, Vector3 } from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { LAYOUT, PALETTE, ROOM } from '../config'
import { dusk } from '../state/dayNight'
import { glassFragment, glassVertex } from '../shaders/sky'

/**
 * Stylized glass instead of MeshTransmissionMaterial, which would redraw the entire café into a buffer every frame.
 * This costs almost nothing and is closer to the painted glass in reference 3.
 */
export function WindowGlass() {
  const { windowX, window: win } = ROOM
  const uniforms = useMemo(
    () => ({
      uGlint: { value: new Color('#fff3df') },
      uNeon: { value: new Color(PALETTE.neon) },
      uNeonPosition: { value: new Vector3(...LAYOUT.neonSign.position) },
      uNight: { value: dusk.night },
      uTime: { value: 0 },
    }),
    [],
  )
  useFrame((_, delta) => {
    uniforms.uNight.value = dusk.night
    uniforms.uTime.value += delta
  })
  const length = win.zMax - win.zMin

  return (
    <mesh position={[windowX + 0.09, (win.sillY + win.headY) / 2, (win.zMax + win.zMin) / 2]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[length, win.headY - win.sillY]} />
      <CustomShaderMaterial
        baseMaterial={MeshBasicMaterial}
        vertexShader={glassVertex}
        fragmentShader={glassFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
