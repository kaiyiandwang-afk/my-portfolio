import { useEffect, useRef } from 'react'
import { useFrame, useStore, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import gsap from 'gsap'
import { MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import { CAMERA, INTERACTIVES, LAYOUT } from '../config'
import { catCloseUp } from '../objects/catBrain'
import { useLook } from '../state/look'
import { useQuality } from '../state/quality'
import { isPhone, usesDrawer } from '../state/panels'
import { useCafe } from '../state/store'
import { rack } from './rack'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Holds the home view's horizontal framing on screens narrower than 16:9, up to a cap. */
function fitFov(aspect: number) {
  const halfTan = Math.tan(MathUtils.degToRad(CAMERA.fov) / 2) * (CAMERA.fovAspect / aspect)
  const fov = MathUtils.radToDeg(Math.atan(halfTan)) * 2
  return MathUtils.clamp(fov, CAMERA.fov, CAMERA.maxFov)
}

const UP = new Vector3(0, 1, 0)
const HEAD = new Vector3(LAYOUT.kaiyi.position[0], 1.415, LAYOUT.kaiyi.position[2])

/**
 * Flights run in straight lines, which can cut through where Kaiyi is sitting. This finds the sideways swing, at its
 * strongest where the line passes nearest her head, that keeps the whole flight clear of it. Null if the line is clear.
 */
function planDetour(from: Vector3, to: Vector3) {
  const point = new Vector3()
  // the shot itself may start or end close to her, so that's as much clearance as there can be
  const clearance = Math.min(CAMERA.headClearance, from.distanceTo(HEAD) - 0.002, to.distanceTo(HEAD) - 0.002)
  let peak = 0.5
  let closest = Infinity
  for (let i = 0; i <= 40; i++) {
    const distance = point.lerpVectors(from, to, i / 40).distanceTo(HEAD)
    if (distance < closest) {
      closest = distance
      peak = i / 40
    }
  }
  if (closest >= clearance) return null

  // swing out horizontally, on whichever side the line already passes, or into the room if it's dead on
  point.lerpVectors(from, to, peak).sub(HEAD)
  const travel = to.clone().sub(from).setY(0)
  const side = new Vector3(-travel.z, 0, travel.x).normalize()
  const sign = Math.abs(side.dot(point)) > 0.01 ? Math.sign(side.dot(point)) : Math.sign(side.z) || 1
  side.multiplyScalar(sign)

  const exponent = Math.log(0.5) / Math.log(MathUtils.clamp(peak, 0.15, 0.85))
  const bump = (t: number) => Math.sin(Math.PI * Math.pow(t, exponent))
  let reach = 0
  for (let pass = 0; pass < 8 && closest < clearance; pass++) {
    reach += (clearance - closest) * 1.25
    closest = Infinity
    for (let i = 1; i < 40; i++) {
      const t = i / 40
      closest = Math.min(closest, point.lerpVectors(from, to, t).addScaledVector(side, reach * bump(t)).distanceTo(HEAD))
    }
  }
  return { side, reach, bump }
}
const DESKTOP_DRAWER = { minScreen: 640, width: 440, margin: 24 }
const PHONE_SHEET_SHIFT = 0.2
const INTRO_PULLBACK = 1.16
const INTRO_SECONDS = 2.4

/**
 * Slides a close-up sideways so its subject stays centered in the part of the screen the drawer leaves open.
 * Moving camera and target together shifts the object without changing the angle.
 */
function shiftForDrawer(position: Vector3, target: Vector3, camera: PerspectiveCamera, width: number, height: number) {
  const distance = position.distanceTo(target)
  const worldPerPixel = (2 * distance * Math.tan(MathUtils.degToRad(camera.fov) / 2)) / height
  if (width >= DESKTOP_DRAWER.minScreen) {
    const drawer = Math.min(DESKTOP_DRAWER.width, width - DESKTOP_DRAWER.margin) + DESKTOP_DRAWER.margin / 2
    const right = target.clone().sub(position).cross(UP).normalize()
    const shift = right.multiplyScalar((drawer / 2) * worldPerPixel)
    position.add(shift)
    target.add(shift)
  } else {
    // the phone's bottom sheet covers the lower part, so the subject moves up instead
    const shift = PHONE_SHEET_SHIFT * height * worldPerPixel
    position.y -= shift
    target.y -= shift
  }
}

/** No walking: a clamped orbit around the home view, a small zoom, and choreographed flights to each object. */
export function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / s.size.height)
  const store = useStore()
  const flight = useRef<gsap.core.Tween | null>(null)
  const homeLimits = useRef<(() => void) | null>(null)
  const driftClock = useRef(0)
  const lastFocus = useRef(new Vector3(...CAMERA.home.target))

  useEffect(() => {
    camera.fov = fitFov(aspect)
    camera.updateProjectionMatrix()
  }, [camera, aspect])

  // Set up the home view and its clamps once.
  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    const { home, orbit } = CAMERA
    controls.setLookAt(...home.position, ...home.target, false)

    const { azimuthAngle, polarAngle, distance } = controls
    homeLimits.current = () => {
      controls.minAzimuthAngle = azimuthAngle - orbit.azimuth
      controls.maxAzimuthAngle = azimuthAngle + orbit.azimuth
      controls.minPolarAngle = polarAngle - orbit.polarUp
      controls.maxPolarAngle = polarAngle + orbit.polarDown
      controls.minDistance = distance * orbit.zoomIn
      controls.maxDistance = distance * orbit.zoomOut
    }
    homeLimits.current()
    controls.truckSpeed = 0 // no panning
    controls.dollySpeed = orbit.dollySpeed
    controls.smoothTime = orbit.smoothTime

    // Waiting outside: a step back from the home view, until the visitor comes in.
    if (!useCafe.getState().entered) {
      const { position: [x, y, z], target } = home
      controls.minDistance = 0.01
      controls.maxDistance = Infinity
      controls.enabled = false
      controls.setLookAt(x * INTRO_PULLBACK, y * INTRO_PULLBACK, z * INTRO_PULLBACK, ...target, false)
    }

    // Dev-only handles for checking poses, look values and frame cost from the browser console. Stripped from production.
    if (import.meta.env.DEV) {
      Object.assign(window, { cafeControls: controls, cafeLook: useLook, cafeThree: store, cafeStore: useCafe, cafeGsap: gsap, cafeRack: rack, cafeQuality: useQuality })
    }
  }, [store])

  useEffect(
    () =>
      useCafe.subscribe((state, previous) => {
        if (!state.entered || previous.entered || !ref.current) return
        const controls = ref.current
        const { position, target } = CAMERA.home
        const finish = () => {
          homeLimits.current?.()
          controls.enabled = true
        }
        if (reducedMotion()) {
          controls.setLookAt(...position, ...target, false)
          finish()
          return
        }
        const progress = { t: 0 }
        gsap.to(progress, {
          t: 1,
          duration: INTRO_SECONDS,
          ease: 'power2.out',
          onUpdate: () => {
            const pull = MathUtils.lerp(INTRO_PULLBACK, 1, progress.t)
            controls.setLookAt(position[0] * pull, position[1] * pull, position[2] * pull, ...target, false)
          },
          onComplete: finish,
        })
      }),
    [],
  )

  // Fly wherever the store's focus points: an object's close-up, or home when it's null.
  useEffect(() => {
    const fly = (focusId: string | null) => {
      const controls = ref.current
      if (!controls) return

      const item = INTERACTIVES.find((candidate) => candidate.id === focusId)
      const closeUp = item?.id === 'cat' ? catCloseUp() : (isPhone() && item?.phoneCloseUp) || item?.closeUp
      const toPosition = new Vector3(...(closeUp ? closeUp.position : CAMERA.home.position))
      const toTarget = new Vector3(...(closeUp ? closeUp.target : CAMERA.home.target))
      const subject = toTarget.clone()
      if (item && usesDrawer(item.id)) {
        const { width, height } = store.getState().size
        shiftForDrawer(toPosition, toTarget, camera, width, height)
      }

      const fromPosition = controls.getPosition(new Vector3())
      const fromTarget = controls.getTarget(new Vector3())

      // Leave the home clamps behind, or they'd fight the flight, and hand the camera over to it.
      flight.current?.kill()
      controls.enabled = false
      controls.minAzimuthAngle = -Infinity
      controls.maxAzimuthAngle = Infinity
      controls.minPolarAngle = 0
      controls.maxPolarAngle = Math.PI
      controls.minDistance = 0.01
      controls.maxDistance = Infinity

      const reduced = reducedMotion()
      const look = useLook.getState()
      const racking = !reduced && look.dof && rack.effect !== null && rack.pass !== null
      const focusFrom = lastFocus.current.clone()
      if (racking) {
        rack.point.copy(focusFrom)
        rack.effect!.target = rack.point
        rack.effect!.cocMaterial.worldFocusRange = look.dofRange
        rack.pass!.enabled = true
      }

      const detour = planDetour(fromPosition, toPosition)
      const position = new Vector3()
      const target = new Vector3()

      const progress = { t: 0 }
      flight.current = gsap.to(progress, {
        t: 1,
        duration: reduced ? CAMERA.flight.reducedDuration : CAMERA.flight.duration,
        ease: reduced ? CAMERA.flight.reducedEase : CAMERA.flight.ease,
        onUpdate: () => {
          position.lerpVectors(fromPosition, toPosition, progress.t)
          if (detour) position.addScaledVector(detour.side, detour.reach * detour.bump(progress.t))
          target.lerpVectors(fromTarget, toTarget, progress.t)
          controls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false)
          if (racking) {
            // the focus pulls across mid-move, and the blur swells then clears
            rack.point.lerpVectors(focusFrom, subject, MathUtils.smoothstep(progress.t, 0.2, 0.8))
            rack.effect!.bokehScale = look.dofBokeh * Math.sin(progress.t * Math.PI)
          }
        },
        onComplete: () => {
          if (racking) {
            rack.pass!.enabled = false
            rack.effect!.target = null
            rack.effect!.bokehScale = 0
          }
          lastFocus.current.copy(subject)
          if (focusId === null) {
            homeLimits.current?.()
            controls.enabled = true
          }
          useCafe.getState().cameraArrived()
        },
      })
    }

    return useCafe.subscribe((state, previous) => {
      if (state.focus !== previous.focus) fly(state.focus)
    })
  }, [camera, store])

  useEffect(() => () => void flight.current?.kill(), [])

  // Idle drift. Applied as tiny relative rotations, so it layers over wherever the visitor has orbited to.
  useFrame((_, delta) => {
    const controls = ref.current
    if (!controls || useCafe.getState().cameraState !== 'home' || reducedMotion()) return
    driftClock.current += delta
    const { azimuth, polar, period } = CAMERA.drift
    const w = (Math.PI * 2) / period
    const dAzimuth = azimuth * w * Math.cos(driftClock.current * w) * delta
    const dPolar = polar * w * 1.4 * Math.cos(driftClock.current * w * 1.4 + 1) * delta
    controls.rotate(dAzimuth, dPolar, true)
  })

  return <CameraControls ref={ref} makeDefault />
}
