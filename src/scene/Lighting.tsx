import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MathUtils, MeshBasicMaterial, Object3D, Vector3 } from 'three'
import type { DirectionalLight, HemisphereLight, InstancedMesh, PointLight } from 'three'
import { LAYOUT, NIGHT, ROOM, SUN } from '../config'
import { leafGeometry } from '../objects/Foliage'
import { seeded } from '../objects/prims'
import { dusk } from '../state/dayNight'
import { useLook } from '../state/look'
import { useCafe } from '../state/store'

const LEAF_COUNT = 150
const WINDOW_PENDANT = 2
const dayColor = new Color()
const nightColor = new Color()

function blendColor(target: Color, day: string, night: string, n: number) {
  target.copy(dayColor.set(day)).lerp(nightColor.set(night), n)
}

/**
 * Leaves that exist only in the shadow map, so the window light lands dappled like reference 1.
 * They float in the sun's path just outside the window and can't be seen from inside.
 */
function LeafGobo() {
  const ref = useRef<InstancedMesh>(null)
  const material = useMemo(() => {
    const m = new MeshBasicMaterial({ colorWrite: false, depthWrite: false })
    m.shadowSide = 2 // DoubleSide: thin leaves must cast from both faces
    return m
  }, [])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const rand = seeded(73)
    const dummy = new Object3D()
    const sun = new Vector3(...SUN.direction).normalize()
    // clumps along the window, each pushed out along the sun's path
    const clumps = Array.from({ length: 11 }, () => ({
      z: ROOM.window.zMin + rand() * 7.5,
      y: ROOM.window.sillY + 0.3 + rand() * (ROOM.window.headY - ROOM.window.sillY),
      out: 1.2 + rand() * 1.6,
    }))
    for (let i = 0; i < LEAF_COUNT; i++) {
      const clump = clumps[i % clumps.length]
      const base = new Vector3(ROOM.windowX, clump.y, clump.z).addScaledVector(sun, clump.out)
      dummy.position.set(
        base.x + (rand() - 0.5) * 0.3,
        base.y + (rand() - 0.5) * 0.62,
        base.z + (rand() - 0.5) * 0.62,
      )
      dummy.rotation.set(rand() * 6.3, rand() * 6.3, rand() * 6.3)
      dummy.scale.setScalar(0.2 + rand() * 0.2)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  return <instancedMesh ref={ref} args={[leafGeometry(), material, LEAF_COUNT]} castShadow frustumCulled={false} />
}

/**
 * A warm key through the window, cool teal fill, and warm pendants: shadows lean cool while lit surfaces lean warm,
 * which is most of what makes this read as anime background art instead of plain 3D.
 */
export function Lighting() {
  const look = useLook()
  const lampOn = useCafe((s) => s.lampOn)

  const { keyPosition, keyTarget } = useMemo(() => {
    const target = new Object3D()
    target.position.set(...SUN.keyTarget)
    return {
      keyTarget: target,
      keyPosition: new Vector3(...SUN.direction).normalize().multiplyScalar(SUN.keyDistance).add(target.position),
    }
  }, [])

  const hemi = useRef<HemisphereLight>(null)
  const key = useRef<DirectionalLight>(null)
  const fill = useRef<DirectionalLight>(null)
  const bounce = useRef<PointLight>(null)
  const lamp = useRef<PointLight>(null)
  const laptop = useRef<PointLight>(null)
  const pendants = useRef<(PointLight | null)[]>([])

  // Everything fades between day and night by writing to the lights directly, so nothing has to re-render.
  useFrame(() => {
    const n = dusk.night
    const lerp = (day: number, night: number) => MathUtils.lerp(day, night, n)
    if (hemi.current) {
      blendColor(hemi.current.color, look.hemiSky, NIGHT.hemiSky, n)
      blendColor(hemi.current.groundColor, look.hemiGround, NIGHT.hemiGround, n)
      hemi.current.intensity = lerp(look.hemiIntensity, NIGHT.hemiIntensity)
    }
    if (key.current) {
      blendColor(key.current.color, look.keyColor, NIGHT.keyColor, n)
      key.current.intensity = lerp(look.keyIntensity, NIGHT.keyIntensity)
    }
    if (fill.current) {
      blendColor(fill.current.color, look.fillColor, NIGHT.fillColor, n)
      fill.current.intensity = lerp(look.fillIntensity, NIGHT.fillIntensity)
    }
    if (bounce.current) {
      blendColor(bounce.current.color, look.bounceColor, NIGHT.bounceColor, n)
      bounce.current.intensity = lerp(look.bounceIntensity, NIGHT.bounceIntensity)
    }
    pendants.current.forEach((pendant, i) => {
      if (pendant) pendant.intensity = lerp(look.pendantIntensity, NIGHT.pendantIntensity) * (i === WINDOW_PENDANT ? NIGHT.windowPendantShare : 1)
    })
    if (laptop.current) laptop.current.intensity = NIGHT.laptopIntensity * n
    if (lamp.current) easingLamp(lamp.current, lampOn ? look.lampIntensity : 0)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={[look.hemiSky, look.hemiGround, look.hemiIntensity]} />

      <primitive object={keyTarget} />
      <directionalLight
        ref={key}
        castShadow
        color={look.keyColor}
        intensity={look.keyIntensity}
        position={keyPosition}
        target={keyTarget}
        shadow-mapSize={[SUN.shadowMapSize, SUN.shadowMapSize]}
        shadow-camera-left={-SUN.shadowArea}
        shadow-camera-right={SUN.shadowArea}
        shadow-camera-top={SUN.shadowArea}
        shadow-camera-bottom={-SUN.shadowArea}
        shadow-camera-near={1}
        shadow-camera-far={SUN.keyDistance * 2}
        shadow-bias={SUN.shadowBias}
        shadow-normalBias={SUN.shadowNormalBias}
        shadow-radius={SUN.shadowRadius}
      />
      <LeafGobo />

      {/* cool fill from the open side of the room */}
      <directionalLight ref={fill} color={look.fillColor} intensity={look.fillIntensity} position={[-5, 2.4, 6]} />

      {/* sunlight bouncing up off the floor */}
      <pointLight ref={bounce} color={look.bounceColor} intensity={look.bounceIntensity} position={LAYOUT.bounceLight} distance={6.5} decay={1.4} />

      {/* These stay mounted and only dim, because changing the light count recompiles every shader. */}
      <pointLight ref={lamp} color={look.lampColor} intensity={0} position={LAYOUT.lampLight} distance={2.4} decay={1.5} />
      <pointLight ref={laptop} color={NIGHT.laptopColor} intensity={0} position={LAYOUT.laptopLight} distance={1.3} decay={1.6} />

      {LAYOUT.pendantLights.map((position, i) => (
        <pointLight
          key={position.join()}
          ref={(light) => void (pendants.current[i] = light)}
          color={look.pendantColor}
          intensity={0}
          position={position}
          distance={5.5}
          decay={1.5}
        />
      ))}
    </>
  )
}

/** A filament warms up and cools down rather than snapping. */
function easingLamp(light: PointLight, target: number) {
  light.intensity += (target - light.intensity) * 0.14
}
