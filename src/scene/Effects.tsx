import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  EffectComposer,
  GodRays,
  HueSaturation,
  N8AO,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing'
import { BlendFunction, DepthOfFieldEffect, EffectPass, KernelSize, OutlineEffect, ToneMappingMode } from 'postprocessing'
import { Color, HalfFloatType, MathUtils, Vector2 } from 'three'
import type { Mesh, WebGLRenderer, WebGLRenderTarget } from 'three'
import { INTERACTIVES, NIGHT } from '../config'
import { dusk } from '../state/dayNight'
import { outlineMeshes } from '../state/interactive'
import { useLook } from '../state/look'
import { useCafe } from '../state/store'
import '../shaders/n8aoPatch'
import { WindowShaftsEffect } from '../shaders/WindowShaftsEffect'
import { rack } from './rack'

interface GodRaysHandle {
  blendMode: { opacity: { value: number } }
}
interface BloomHandle {
  intensity: number
  luminanceMaterial: { threshold: number }
}

const TONE_MAPPING = {
  AGX: ToneMappingMode.AGX,
  ACES: ToneMappingMode.ACES_FILMIC,
  NEUTRAL: ToneMappingMode.NEUTRAL,
}

function WindowShafts() {
  const camera = useThree((s) => s.camera)
  const color = useLook((s) => s.shaftColor)
  const intensity = useLook((s) => s.shaftIntensity)
  const effect = useMemo(() => new WindowShaftsEffect(camera), [camera])
  const blended = useMemo(() => new Color(), [])
  useFrame(() => {
    const n = dusk.night
    blended.set(color).lerp(nightShaft, n)
    effect.setColor(blended.getStyle(), MathUtils.lerp(intensity, NIGHT.shaftIntensity, n))
  })
  return <primitive object={effect} dispose={null} />
}

const nightShaft = new Color(NIGHT.shaftColor)

/**
 * Depth of field in a pass of its own, switched on only while the camera flies. It was the most expensive effect by far,
 * so at rest it costs nothing. It renders for its first couple of frames so its shaders compile during load, not mid-flight.
 */
function RackFocus() {
  const camera = useThree((s) => s.camera)
  const { effect, pass } = useMemo(() => {
    const dof = new DepthOfFieldEffect(camera, { worldFocusDistance: 5, worldFocusRange: 1.4, bokehScale: 0 })
    return { effect: dof, pass: new EffectPass(camera, dof) }
  }, [camera])

  // Published here rather than inside useMemo: StrictMode runs that twice and keeps only the first result.
  useLayoutEffect(() => {
    rack.effect = effect
    rack.pass = pass
  }, [effect, pass])

  const warmupFrames = useRef(2)
  useFrame(() => {
    if (warmupFrames.current > 0 && --warmupFrames.current === 0 && useCafe.getState().cameraState === 'home') {
      pass.enabled = false
    }
  })

  return <primitive object={pass} dispose={null} />
}

/**
 * OutlineEffect's mask clears to a special background color, and renderer.autoClear would wipe that straight back to
 * black, leaving no edges to find. N8AO and god rays need autoClear on, so it's only suspended for this effect's update.
 */
class GlowEffect extends OutlineEffect {
  override update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget, deltaTime?: number) {
    const autoClear = renderer.autoClear
    renderer.autoClear = false
    super.update(renderer, inputBuffer, deltaTime)
    renderer.autoClear = autoClear
  }
}

const HOVER_STRENGTH = 9
const PULSE_MS = 1700
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The hover glow: a soft sun-colored edge around whatever is under the pointer. It does no work when nothing is. */
function HoverGlow() {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const hovered = useCafe((s) => s.hovered)
  const effect = useMemo(
    () =>
      new GlowEffect(scene, camera, {
        blendFunction: BlendFunction.ADD,
        edgeStrength: HOVER_STRENGTH,
        visibleEdgeColor: new Color('#ffb86b').getHex(),
        hiddenEdgeColor: new Color('#ffb86b').getHex(),
        blur: true,
        kernelSize: KernelSize.MEDIUM,
        xRay: false,
        resolutionScale: 0.5,
      }),
    [scene, camera],
  )

  const pulsing = useRef(false)

  useEffect(() => {
    effect.selection.set(hovered ? outlineMeshes(hovered) : [])
  }, [effect, hovered])

  // Once, just after arriving: everything clickable glows up and fades, so the visitor can see what's alive.
  useFrame(() => {
    const { pulseAt, hovered: current } = useCafe.getState()
    if (!pulseAt) return
    const t = (performance.now() - pulseAt) / PULSE_MS
    if (t < 0) return
    const strength = effect.uniforms.get('edgeStrength')!
    if (t >= 1 || reducedMotion()) {
      strength.value = HOVER_STRENGTH
      effect.selection.set(current ? outlineMeshes(current) : [])
      pulsing.current = false
      useCafe.setState({ pulseAt: 0 })
      return
    }
    if (!pulsing.current) {
      pulsing.current = true
      effect.selection.set(INTERACTIVES.flatMap(({ id }) => outlineMeshes(id)))
    }
    strength.value = HOVER_STRENGTH * Math.sin(t * Math.PI)
  })

  if (import.meta.env.DEV) Object.assign(window, { cafeGlow: effect })

  return <primitive object={effect} dispose={null} />
}

export function Effects({ sun }: { sun: Mesh }) {
  const look = useLook()
  const aberration = useMemo(() => new Vector2(look.aberration, look.aberration), [look.aberration])
  const godRays = useRef<GodRaysHandle>(null)
  const bloom = useRef<BloomHandle>(null)

  // Written straight to the effects: changing their props would rebuild them, and with them the whole composer.
  useFrame(() => {
    const n = dusk.night
    if (godRays.current) godRays.current.blendMode.opacity.value = MathUtils.lerp(1, NIGHT.godRaysOpacity, n)
    if (bloom.current) {
      bloom.current.intensity = MathUtils.lerp(look.bloomIntensity, NIGHT.bloomIntensity, n)
      bloom.current.luminanceMaterial.threshold = MathUtils.lerp(look.bloomThreshold, NIGHT.bloomThreshold, n)
    }
  })

  return (
    <EffectComposer multisampling={look.msaa} frameBufferType={HalfFloatType}>
      {look.ao ? (
        <N8AO
          aoRadius={look.aoRadius}
          distanceFalloff={look.aoFalloff}
          intensity={look.aoIntensity}
          color={look.aoColor}
          quality={look.aoQuality}
          halfRes
        />
      ) : (
        <></>
      )}
      {look.shafts ? <WindowShafts /> : <></>}
      {look.godRays ? (
        <GodRays
          ref={godRays as never}
          sun={sun}
          blendFunction={BlendFunction.SCREEN}
          samples={48}
          density={look.godRaysDensity}
          decay={look.godRaysDecay}
          weight={look.godRaysWeight}
          exposure={look.godRaysExposure}
          clampMax={look.godRaysClamp}
          kernelSize={KernelSize.SMALL}
          blur
        />
      ) : (
        <></>
      )}
      {/* before bloom on purpose: its bright edge is what bloom turns into a soft halo */}
      <HoverGlow />
      <RackFocus />
      <Bloom
        ref={bloom as never}
        mipmapBlur
        intensity={look.bloomIntensity}
        luminanceThreshold={look.bloomThreshold}
        luminanceSmoothing={look.bloomSmoothing}
        radius={look.bloomRadius}
      />
      <ToneMapping mode={TONE_MAPPING[look.toneMapping]} />
      <HueSaturation saturation={look.saturation} />
      <BrightnessContrast brightness={look.brightness} contrast={look.contrast} />
      <ChromaticAberration offset={aberration} radialModulation modulationOffset={0.35} />
      <Noise premultiply={false} blendFunction={BlendFunction.OVERLAY} opacity={look.grain} />
      <Vignette offset={look.vignetteOffset} darkness={look.vignetteDarkness} />
    </EffectComposer>
  )
}
