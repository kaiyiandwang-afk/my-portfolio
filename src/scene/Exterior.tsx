import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, MathUtils, MeshBasicMaterial, Object3D, RepeatWrapping, Vector3 } from 'three'
import type { InstancedMesh, Mesh, Texture } from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'
import { EXTERIOR, LAYOUT, NIGHT, PALETTE, SUN } from '../config'
import { leafGeometry } from '../objects/Foliage'
import { makeCanvasTexture, seeded } from '../objects/prims'
import { paintCity, paintCityLights, paintMountains, paintShopLights, paintShops, paintTree } from '../shaders/paintExterior'
import { skyFragment, skyVertex } from '../shaders/sky'
import { dusk } from '../state/dayNight'
import { useLook } from '../state/look'

const FACING_ROOM: [number, number, number] = [0, -Math.PI / 2, 0]
const FLOOR: [number, number, number] = [-Math.PI / 2, 0, 0]

/** Every painted surface outside, which falls into shadow together after dark. Each keeps its own daytime color. */
const painted = new Map<MeshBasicMaterial, Color>()
const nightLights = new Set<MeshBasicMaterial>()

function track(base: Color) {
  return (material: MeshBasicMaterial | null) => {
    if (material) painted.set(material, base)
  }
}

/** Writes the fade to the materials above, only on frames where something changed. */
function ExteriorDusk() {
  const gain = useLook((s) => s.exteriorGain)
  const last = useRef(-1)
  useFrame(() => {
    const key = dusk.night + gain
    if (key === last.current) return
    last.current = key
    const n = dusk.night
    const [r, g, b] = NIGHT.exteriorTint
    painted.forEach((base, material) => {
      material.color.setRGB(base.r * gain * MathUtils.lerp(1, r, n), base.g * gain * MathUtils.lerp(1, g, n), base.b * gain * MathUtils.lerp(1, b, n))
    })
    nightLights.forEach((material) => {
      material.opacity = n
      material.visible = n > 0.002
    })
  })
  return null
}

const WHITE = new Color(1, 1, 1)
const SKY = {
  top: [new Color(EXTERIOR.skyTop), new Color(NIGHT.skyTop)],
  mid: [new Color(EXTERIOR.skyMid), new Color(NIGHT.skyMid)],
  low: [new Color(EXTERIOR.skyLow), new Color(NIGHT.skyLow)],
  cloudLight: [new Color(EXTERIOR.cloudLight), new Color(NIGHT.cloudLight)],
  cloudShade: [new Color(EXTERIOR.cloudShade), new Color(NIGHT.cloudShade)],
  glow: [new Color(EXTERIOR.sunColor), new Color(NIGHT.moonGlow)],
}

function Sky() {
  const sunGlow = useLook((s) => s.sunGlow)
  const uniforms = useMemo(
    () => ({
      uTop: { value: new Color(EXTERIOR.skyTop) },
      uMid: { value: new Color(EXTERIOR.skyMid) },
      uLow: { value: new Color(EXTERIOR.skyLow) },
      uCloudLight: { value: new Color(EXTERIOR.cloudLight) },
      uCloudShade: { value: new Color(EXTERIOR.cloudShade) },
      uSunColor: { value: new Color(EXTERIOR.sunColor) },
      uSunPosition: { value: new Vector3(...SUN.discPosition) },
      uSunGlow: { value: 1 },
      uTime: { value: 0 },
      uNight: { value: 0 },
    }),
    [],
  )
  uniforms.uSunGlow.value = sunGlow

  useFrame((_, delta) => {
    uniforms.uTime.value += delta
    const n = dusk.night
    uniforms.uNight.value = n
    uniforms.uTop.value.lerpColors(SKY.top[0], SKY.top[1], n)
    uniforms.uMid.value.lerpColors(SKY.mid[0], SKY.mid[1], n)
    uniforms.uLow.value.lerpColors(SKY.low[0], SKY.low[1], n)
    uniforms.uCloudLight.value.lerpColors(SKY.cloudLight[0], SKY.cloudLight[1], n)
    uniforms.uCloudShade.value.lerpColors(SKY.cloudShade[0], SKY.cloudShade[1], n)
    uniforms.uSunColor.value.lerpColors(SKY.glow[0], SKY.glow[1], n)
    uniforms.uSunGlow.value = sunGlow * MathUtils.lerp(1, 0.42, n)
  })

  return (
    <mesh position={[130, 60, 0]} rotation={FACING_ROOM}>
      <planeGeometry args={[560, 170]} />
      <CustomShaderMaterial
        baseMaterial={MeshBasicMaterial}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        fog={false}
      />
    </mesh>
  )
}

/** A painted sheet standing at a real distance, so the orbit produces true parallax between layers. */
function Layer({
  texture,
  x,
  width,
  height,
  base = EXTERIOR.groundY,
  z = 0,
  repeat = 1,
}: {
  texture: Texture
  x: number
  width: number
  height: number
  base?: number
  z?: number
  /** Tile the sheet across its width, which keeps painted detail from stretching. */
  repeat?: number
}) {
  if (repeat !== 1) {
    texture.wrapS = RepeatWrapping
    texture.repeat.x = repeat
  }
  return (
    <mesh position={[x, base + height / 2, z]} rotation={FACING_ROOM}>
      <planeGeometry args={[width, height]} />
      {/* alpha-tested rather than blended, so layers write depth and hide the sun for the god rays */}
      <meshBasicMaterial ref={track(WHITE)} map={texture} alphaTest={0.5} fog={false} />
    </mesh>
  )
}

/** A sheet of lit windows laid just in front of a painted layer, invisible until dusk. */
function LightsLayer({ texture, x, width, height, repeat }: { texture: Texture; x: number; width: number; height: number; repeat: number }) {
  texture.wrapS = RepeatWrapping
  texture.repeat.x = repeat
  return (
    <mesh position={[x - 0.05, EXTERIOR.groundY + height / 2, 0]} rotation={FACING_ROOM}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        ref={(material) => {
          if (material) nightLights.add(material)
        }}
        map={texture}
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}

function Trees() {
  const textures = useMemo(() => [paintTree(101), paintTree(202), paintTree(303)], [])
  return (
    <>
      {EXTERIOR.trees.map(({ x, z, height }, i) => (
        <Layer key={i} texture={textures[i % textures.length]} x={x} z={z} width={height * 0.8} height={height} />
      ))}
    </>
  )
}

function Street() {
  const dashes = useMemo(() => Array.from({ length: 30 }, (_, i) => -70 + i * 4.6), [])
  const tint = (hex: string) => track(new Color(hex))
  const y = EXTERIOR.groundY
  return (
    <group>
      <mesh position={[9, y, 0]} rotation={FLOOR}>
        <planeGeometry args={[12, 200]} />
        <meshBasicMaterial ref={tint(PALETTE.sidewalk)} fog={false} />
      </mesh>
      <mesh position={[19.5, y - 0.01, 0]} rotation={FLOOR}>
        <planeGeometry args={[9, 200]} />
        <meshBasicMaterial ref={tint(PALETTE.road)} fog={false} />
      </mesh>
      {dashes.map((z) => (
        <mesh key={z} position={[19.5, y + 0.01, z]} rotation={FLOOR}>
          <planeGeometry args={[0.14, 2.1]} />
          <meshBasicMaterial ref={tint('#f0e0c0')} fog={false} />
        </mesh>
      ))}
      <mesh position={[27, y, 0]} rotation={FLOOR}>
        <planeGeometry args={[6, 200]} />
        <meshBasicMaterial ref={tint(PALETTE.sidewalk)} fog={false} />
      </mesh>
      <mesh position={[80, y - 0.02, 0]} rotation={FLOOR}>
        <planeGeometry args={[100, 320]} />
        <meshBasicMaterial ref={tint(EXTERIOR.groundHaze)} fog={false} />
      </mesh>
    </group>
  )
}

/** The 咖啡 sign, hung just outside the window. */
function NeonSign() {
  const texture = useMemo(
    () =>
      makeCanvasTexture(256, 768, (ctx, w, h) => {
        ctx.fillStyle = '#231419'
        ctx.fillRect(0, 0, w, h)
        ctx.strokeStyle = PALETTE.neon
        ctx.lineWidth = 7
        ctx.strokeRect(16, 16, w - 32, h - 32)
        ctx.fillStyle = PALETTE.neon
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '700 172px "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'
        ctx.fillText('咖', w / 2, h * 0.31)
        ctx.fillText('啡', w / 2, h * 0.69)
      }, ['700 172px "Noto Sans SC"']),
    [],
  )
  const { position, rotationY } = LAYOUT.neonSign
  const face = useRef<MeshBasicMaterial>(null)
  // unlit by day, as a neon sign would look in the sun
  useFrame(() => {
    const gain = MathUtils.lerp(0.72, NIGHT.neonGain, dusk.night)
    face.current?.color.setRGB(gain, gain, gain)
  })
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[0.52, 1.56, 0.06]} />
        <meshBasicMaterial color="#1b1218" fog={false} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[0.5, 1.5]} />
        <meshBasicMaterial ref={face} map={texture} fog={false} />
      </mesh>
    </group>
  )
}

const LEAF_COUNT = 26
const LEAF_AREA = { x: [3.7, 8], y: [0, 3.6], z: [-3.5, 8] } as const

/** Leaves blowing slowly past the window at golden hour. Gone after dark. */
function DriftingLeaves() {
  const mesh = useRef<InstancedMesh>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const leaves = useMemo(() => {
    const rand = seeded(61)
    return Array.from({ length: LEAF_COUNT }, () => ({
      x: MathUtils.lerp(LEAF_AREA.x[0], LEAF_AREA.x[1], rand()),
      y: MathUtils.lerp(LEAF_AREA.y[0], LEAF_AREA.y[1], rand()),
      z: MathUtils.lerp(LEAF_AREA.z[0], LEAF_AREA.z[1], rand()),
      spin: rand() * 6.3,
      rate: 0.6 + rand() * 1.2,
      size: 0.055 + rand() * 0.05,
    }))
  }, [])
  const dummy = useMemo(() => new Object3D(), [])

  useFrame((_, rawDelta) => {
    if (!mesh.current || !material.current) return
    const delta = Math.min(rawDelta, 0.1)
    material.current.opacity = 1 - dusk.night
    mesh.current.visible = dusk.night < 0.98
    leaves.forEach((leaf, i) => {
      leaf.spin += delta * leaf.rate
      leaf.y -= delta * (0.16 + leaf.rate * 0.1)
      leaf.z -= delta * (0.28 + leaf.rate * 0.22)
      if (leaf.y < LEAF_AREA.y[0]) leaf.y = LEAF_AREA.y[1]
      if (leaf.z < LEAF_AREA.z[0]) leaf.z = LEAF_AREA.z[1]
      dummy.position.set(leaf.x, leaf.y + Math.sin(leaf.spin) * 0.06, leaf.z)
      dummy.rotation.set(leaf.spin, leaf.spin * 0.7, leaf.spin * 0.4)
      dummy.scale.setScalar(leaf.size)
      dummy.updateMatrix()
      mesh.current!.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[leafGeometry(), undefined, LEAF_COUNT]} frustumCulled={false}>
      <meshBasicMaterial ref={material} color="#d9a04a" side={DoubleSide} transparent fog={false} />
    </instancedMesh>
  )
}

/** Everything through the window, unlit and painted. Real depth layers give the parallax. */
export function Exterior({ onSun }: { onSun: (sun: Mesh) => void }) {
  const sunRef = useRef<Mesh | null>(null)
  const textures = useMemo(
    () => ({
      far: paintMountains(EXTERIOR.mountainsFar),
      mid: paintMountains(EXTERIOR.mountainsMid),
      near: paintMountains(EXTERIOR.mountainsNear),
      cityFar: paintCity(EXTERIOR.cityFar),
      cityNear: paintCity(EXTERIOR.cityNear),
      shops: paintShops(19),
      cityFarLights: paintCityLights(EXTERIOR.cityFar),
      cityNearLights: paintCityLights(EXTERIOR.cityNear),
      shopLights: paintShopLights(19),
    }),
    [],
  )
  const disc = useRef<MeshBasicMaterial>(null)
  const sunColors = useMemo(() => [new Color(EXTERIOR.sunDisc), new Color(NIGHT.moonDisc)], [])

  // The same disc is the sun by day and the moon by night, so the god rays follow along.
  useFrame(() => {
    const n = dusk.night
    disc.current?.color.lerpColors(sunColors[0], sunColors[1], n)
    sunRef.current?.scale.setScalar(MathUtils.lerp(1, NIGHT.moonScale, n))
  })

  return (
    <group>
      <ExteriorDusk />
      <Sky />

      {/* GodRays reads this disc. It must stay transparent and not write depth. */}
      <mesh
        ref={(mesh) => {
          if (mesh && sunRef.current !== mesh) {
            sunRef.current = mesh
            onSun(mesh)
          }
        }}
        position={SUN.discPosition}
      >
        <sphereGeometry args={[SUN.discRadius, 24, 16]} />
        <meshBasicMaterial ref={disc} color={EXTERIOR.sunDisc} transparent depthWrite={false} fog={false} />
      </mesh>

      <Layer texture={textures.far} x={100} width={330} height={15} />
      <Layer texture={textures.mid} x={80} width={270} height={10} />
      <Layer texture={textures.near} x={64} width={220} height={7.5} />
      <Layer texture={textures.cityFar} x={52} width={170} height={6.4} repeat={6} />
      <LightsLayer texture={textures.cityFarLights} x={52} width={170} height={6.4} repeat={6} />
      <Layer texture={textures.cityNear} x={42} width={140} height={5} repeat={5} />
      <LightsLayer texture={textures.cityNearLights} x={42} width={140} height={5} repeat={5} />
      <Layer texture={textures.shops} x={30} width={64} height={3} repeat={4} />
      <LightsLayer texture={textures.shopLights} x={30} width={64} height={3} repeat={4} />
      <Trees />
      <DriftingLeaves />
      <Street />
      <NeonSign />
    </group>
  )
}
