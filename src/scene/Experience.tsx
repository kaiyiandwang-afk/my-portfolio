import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Color } from 'three'
import type { FogExp2, Mesh } from 'three'
import { CAMERA, NIGHT, PALETTE } from '../config'
import { dusk } from '../state/dayNight'
import { useQuality } from '../state/quality'
import { CameraRig } from './CameraRig'
import { Dust } from './Dust'
import { Effects } from './Effects'
import { Exterior } from './Exterior'
import { Lighting } from './Lighting'
import { HitTargets } from './HitTargets'
import { Room, WindowFrames } from './Room'
import { useCafe } from '../state/store'
import { useLook } from '../state/look'
import { TagProjector } from './TagProjector'
import { Bar } from '../objects/Bar'
import { Bookshelf, Terrarium } from '../objects/Bookshelf'
import { Cat } from '../objects/Cat'
import { Chalkboard } from '../objects/Chalkboard'
import { Corkboard } from '../objects/Corkboard'
import { DeskLamp, DeskProps } from '../objects/DeskProps'
import { Decor } from '../objects/Decor'
import { EspressoMachine } from '../objects/EspressoMachine'
import { FilmCamera } from '../objects/FilmCamera'
import { FramedArt } from '../objects/FramedArt'
import { Hotpot } from '../objects/Hotpot'
import { Interactive } from '../objects/Interactive'
import { Kaiyi } from '../objects/Kaiyi'
import { Laptop } from '../objects/Laptop'
import { RecordPlayer } from '../objects/RecordPlayer'
import { Telephone } from '../objects/Telephone'
import { WallClock } from '../objects/WallClock'
import { WindowCounter } from '../objects/WindowCounter'

function Fog() {
  const color = useLook((s) => s.fogColor)
  const density = useLook((s) => s.fogDensity)
  const fog = useRef<FogExp2>(null)
  const day = useMemo(() => new Color(), [])
  useFrame(() => {
    fog.current?.color.copy(day.set(color)).lerp(NIGHT_FOG, dusk.night)
  })
  return <fogExp2 ref={fog} attach="fog" args={[color, density]} />
}

const NIGHT_FOG = new Color(NIGHT.fogColor)

/** Tells the page the scene is really drawing, a few frames in, once the shaders have compiled. */
function ReadySignal() {
  const frames = useRef(0)
  useFrame(() => {
    if (++frames.current === 3) useCafe.setState({ sceneReady: true })
  })
  return null
}

export function Experience() {
  // GodRays needs the sun's mesh to exist before it mounts.
  const [sun, setSun] = useState<Mesh | null>(null)
  const dpr = useQuality((s) => s.dpr)
  const stepDown = useQuality((s) => s.stepDown)

  return (
    <Canvas
      flat
      shadows="percentage"
      dpr={Math.min(dpr, window.devicePixelRatio || 1)}
      camera={{ fov: CAMERA.fov, near: CAMERA.near, far: CAMERA.far, position: CAMERA.home.position }}
      gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }}
      // Clicking away from a close-up goes back, like clicking v1's drawer scrim.
      onPointerMissed={() => useCafe.getState().back()}
      aria-label="A cozy 3D café. Kaiyi sits at the window counter with her laptop and her cat. Use the Explore menu to visit each part of her portfolio."
    >
      <ReadySignal />
      <PerformanceMonitor onDecline={stepDown} />
      <color attach="background" args={[PALETTE.ink]} />
      <Fog />
      <CameraRig />
      <Lighting />

      <Room />
      <Exterior onSun={setSun} />
      <WindowCounter />
      <Bar />
      <Decor />

      <Interactive id="window"><WindowFrames /></Interactive>
      <Interactive id="kaiyi"><Kaiyi /></Interactive>
      <Interactive id="laptop"><Laptop /></Interactive>
      <DeskProps />
      <Interactive id="lamp"><DeskLamp /></Interactive>
      <Interactive id="telephone"><Telephone /></Interactive>
      <Interactive id="cat"><Cat /></Interactive>
      <Interactive id="filmCamera"><FilmCamera /></Interactive>
      <Interactive id="recordPlayer"><RecordPlayer /></Interactive>
      <Interactive id="hotpot"><Hotpot /></Interactive>
      <Interactive id="art"><FramedArt /></Interactive>
      <Interactive id="corkboard"><Corkboard /></Interactive>
      <Interactive id="bookshelf"><Bookshelf /></Interactive>
      <Interactive id="terrarium"><Terrarium /></Interactive>
      <Interactive id="clock"><WallClock /></Interactive>
      <Interactive id="chalkboard"><Chalkboard /></Interactive>
      <Interactive id="espresso"><EspressoMachine /></Interactive>
      <HitTargets />

      <Dust />
      <TagProjector />
      {sun && <Effects sun={sun} />}
    </Canvas>
  )
}
