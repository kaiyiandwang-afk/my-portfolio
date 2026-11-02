import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { COUNTER, LAYOUT } from '../config'
import type { Vec3 } from '../config'
import { playSound } from '../audio/mixer'
import { dusk } from '../state/dayNight'

/**
 * What the cat is doing and where it is. Objects/Cat.tsx turns this into a pose every frame, and the hover box, the tag
 * and the camera read it to find the cat. It naps on the counter, hops down, wanders the floor, visits the hotpot table
 * and suns itself, then jumps back up to its spot.
 */

export type CatPose = 'loaf' | 'sit' | 'stand' | 'crouch' | 'air' | 'stretch'

type Ground = [x: number, z: number]

type Step =
  | { do: 'rest'; pose: 'loaf' | 'sit'; seconds: [number, number]; wag?: boolean }
  | { do: 'walk'; to: Ground[] }
  | { do: 'jump'; to: Vec3 }
  | { do: 'face'; yaw: number }
  | { do: 'stretch' }

const HOME = LAYOUT.cat
const COUNTER_Y = COUNTER.topY
/** Top of the hotpot's table. Objects/Hotpot.tsx builds to the same height. */
const TABLE_Y = 0.74

// Lanes run between the counter stools and around the table, and landings on the table pass beside the pot, not into it.
const ROUTE: Step[] = [
  { do: 'rest', pose: 'loaf', seconds: [14, 22] },
  { do: 'stretch' },
  { do: 'walk', to: [[2.6, 1.4], [2.5, 1.5]] },
  { do: 'rest', pose: 'sit', seconds: [2, 3.5] },
  { do: 'jump', to: [1.62, 0, 1.5] },
  { do: 'walk', to: [[1.1, 1.85], [0.55, 1.95], [0.11, 1.65], [0.11, 1.42]] },
  { do: 'jump', to: [0.11, TABLE_Y, 0.57] },
  { do: 'rest', pose: 'sit', seconds: [7, 11], wag: true },
  { do: 'jump', to: [0.11, 0, -0.32] },
  { do: 'walk', to: [[0.5, -0.72], [1.1, -0.62]] },
  { do: 'rest', pose: 'loaf', seconds: [8, 13] },
  { do: 'stretch' },
  { do: 'walk', to: [[1.4, -0.1], [1.38, 0.7], [1.45, 1.25], [1.72, 1.5]] },
  { do: 'jump', to: [2.5, COUNTER_Y, 1.5] },
  { do: 'walk', to: [[2.6, 1.38], [HOME.position[0], HOME.position[2]]] },
  { do: 'face', yaw: HOME.rotationY },
]

const WALK_SPEED = 0.36
const TURN_SPEED = 2.6
/** World meters covered by one full cycle of the four legs. */
export const CAT_STRIDE = 0.4
const CROUCH_SECONDS = 0.5
const LAND_SECONDS = 0.28
/** How long the legs get to stand up before the cat sets off. */
const RISE_SECONDS = 0.4
const STRETCH_SECONDS = 1.5
/** It naps longer after dark. */
const NIGHT_NAPS = 3
const MEOW_SECONDS = 0.6

type Stage = 'rest' | 'rise' | 'turn' | 'walk' | 'crouch' | 'air' | 'land' | 'held' | 'stretch'

/** The live state. Mutated in place every frame; nothing re-renders. */
export const cat = {
  position: new Vector3(...HOME.position),
  yaw: HOME.rotationY,
  pose: 'loaf' as CatPose,
  /** World meters per second, for the gait. */
  speed: 0,
  /** Radians per second, so the legs shuffle during a turn. */
  turning: 0,
  /** Cycles of the walk, 0 to 1 per stride. */
  gait: 0,
  /** Extra nose-down pitch in flight, in radians. */
  airPitch: 0,
  purring: true,
  wagging: false,
  /** Eyes mostly shut and breathing slow. */
  dozing: true,
  /** Seconds left of a meow: its mouth opens while this is above zero. */
  meow: 0,
}

const angleTo = (from: number, to: number) => MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI

let index = 0
let stage: Stage = 'rest'
let clock = 0
let restFor = 18
let path: CatmullRomCurve3 | null = null
let pathLength = 0
let along = 0
let remaining: Ground[] = []
let heading = 0
let jumpFrom = new Vector3()
let jumpTo = new Vector3()
let jumpSeconds = 0.6
let jumpArc = 0.3
let wasHeld = false
let holdYaw = 0
let holdStretch = false
let holdSettled = false

function begin(step: Step) {
  clock = 0
  cat.wagging = false
  cat.dozing = false
  cat.purring = false
  if (step.do === 'rest') {
    stage = 'rest'
    cat.pose = step.pose
    restFor = MathUtils.randFloat(...step.seconds) * (step.pose === 'loaf' && dusk.night > 0.5 ? NIGHT_NAPS : 1)
    cat.wagging = !!step.wag
    cat.purring = step.pose === 'loaf'
    cat.dozing = step.pose === 'loaf'
  } else if (step.do === 'walk') {
    remaining = step.to
    planWalk()
    stage = 'rise'
    cat.pose = 'stand'
  } else if (step.do === 'jump') {
    jumpFrom.copy(cat.position)
    jumpTo.set(...step.to)
    heading = Math.atan2(jumpTo.x - jumpFrom.x, jumpTo.z - jumpFrom.z)
    stage = 'rise'
    cat.pose = 'stand'
    const rising = jumpTo.y > jumpFrom.y
    jumpArc = rising ? 0.34 : 0.14
    jumpSeconds = rising ? 0.68 : 0.62
  } else if (step.do === 'stretch') {
    stage = 'stretch'
    cat.pose = 'stretch'
  } else {
    heading = step.yaw
    stage = 'rise'
    cat.pose = 'stand'
  }
}

function planWalk() {
  // A waypoint it's already standing on would give the curve a zero-length span and an undefined heading.
  const points = [cat.position.clone()]
  for (const [x, z] of remaining) {
    const point = new Vector3(x, cat.position.y, z)
    if (point.distanceTo(points[points.length - 1]) > 0.02) points.push(point)
  }
  if (points.length < 2) points.push(cat.position.clone().add(new Vector3(Math.sin(cat.yaw), 0, Math.cos(cat.yaw)).multiplyScalar(0.03)))
  path = new CatmullRomCurve3(points, false, 'centripetal')
  pathLength = path.getLength()
  along = 0
  const tangent = path.getTangentAt(0)
  heading = Math.atan2(tangent.x, tangent.z)
}

function next() {
  index = (index + 1) % ROUTE.length
  begin(ROUTE[index])
}

function turnToward(goal: number, delta: number) {
  const difference = angleTo(cat.yaw, goal)
  const change = MathUtils.clamp(difference, -TURN_SPEED * delta, TURN_SPEED * delta)
  cat.yaw += change
  cat.turning = delta > 0 ? Math.abs(change) / delta : 0
  cat.gait += (Math.abs(change) * 0.16) / CAT_STRIDE
  return Math.abs(difference) < 0.06
}

/** Moves the walk's start to wherever the cat stopped, keeping only the waypoints still ahead of it. */
function resumeWalk() {
  const step = ROUTE[index]
  if (step.do !== 'walk') return
  const passed = Math.floor(along * step.to.length)
  remaining = step.to.slice(Math.min(passed, step.to.length - 1))
  planWalk()
  stage = 'rise'
  cat.pose = 'stand'
  clock = 0
}

export function tickCat(delta: number, attending: boolean, stayPut: boolean) {
  clock += delta
  cat.turning = 0

  // Whatever it's doing short of being mid-leap, it stops for a visitor. It needs to be somewhere the camera can find.
  if (attending && !wasHeld && stage !== 'air' && stage !== 'land') {
    wasHeld = true
    const camera = catCloseUp().position
    holdYaw = Math.atan2(camera[0] - cat.position.x, camera[2] - cat.position.z)
    // If it was asleep it wakes properly first, as cats do: a long stretch, then a hello.
    holdStretch = cat.pose === 'loaf'
    holdSettled = false
    stage = 'held'
    clock = 0
    cat.pose = holdStretch ? 'stretch' : 'stand'
    cat.wagging = false
    cat.purring = true
    cat.dozing = false
  }
  if (!attending && wasHeld) {
    wasHeld = false
    const step = ROUTE[index]
    if (step.do === 'walk') resumeWalk()
    else begin(step)
  }

  if (stage !== 'walk') cat.speed = Math.max(0, cat.speed - delta * 2)

  switch (stage) {
    case 'held': {
      const waking = holdStretch ? STRETCH_SECONDS : 0
      if (clock < waking) break
      cat.pose = holdSettled ? 'sit' : 'stand'
      if (!holdSettled && clock > waking + RISE_SECONDS && turnToward(holdYaw, delta)) {
        holdSettled = true
        cat.meow = MEOW_SECONDS
        playSound('meow')
      }
      break
    }

    case 'stretch':
      if (clock > STRETCH_SECONDS) next()
      break

    case 'rest':
      if (!stayPut && clock > restFor) next()
      break

    case 'rise':
      if (clock > RISE_SECONDS) {
        stage = 'turn'
        clock = 0
      }
      break

    case 'turn':
      if (turnToward(heading, delta)) {
        const step = ROUTE[index]
        clock = 0
        if (step.do === 'walk') stage = 'walk'
        else if (step.do === 'jump') {
          stage = 'crouch'
          cat.pose = 'crouch'
        } else next()
      }
      break

    case 'walk': {
      if (!path) break
      cat.speed = Math.min(WALK_SPEED, cat.speed + delta * 1.4)
      along = Math.min(1, along + (cat.speed * delta) / pathLength)
      path.getPointAt(along, cat.position)
      const tangent = path.getTangentAt(along)
      cat.yaw += MathUtils.clamp(angleTo(cat.yaw, Math.atan2(tangent.x, tangent.z)), -TURN_SPEED * delta, TURN_SPEED * delta)
      cat.gait += (cat.speed * delta) / CAT_STRIDE
      if (along >= 1) next()
      break
    }

    case 'crouch':
      if (clock > CROUCH_SECONDS) {
        stage = 'air'
        clock = 0
        cat.pose = 'air'
      }
      break

    case 'air': {
      const t = Math.min(1, clock / jumpSeconds)
      cat.position.lerpVectors(jumpFrom, jumpTo, t)
      // a parabola from one height to the other, peaking jumpArc above the higher of the two
      const low = Math.min(jumpFrom.y, jumpTo.y)
      const high = Math.max(jumpFrom.y, jumpTo.y) + jumpArc
      const rise = Math.sqrt((high - jumpFrom.y) / Math.max(high - low, 0.001))
      const fall = Math.sqrt((high - jumpTo.y) / Math.max(high - low, 0.001))
      const peak = rise / (rise + fall)
      const s = t < peak ? 1 - t / peak : (t - peak) / (1 - peak)
      cat.position.y = high - s * s * (t < peak ? high - jumpFrom.y : high - jumpTo.y)
      // nose up off the ground, nose down to the landing
      cat.airPitch = MathUtils.lerp(-0.62, 0.52, t)
      if (t >= 1) {
        cat.position.copy(jumpTo)
        cat.airPitch = 0
        stage = 'land'
        clock = 0
        cat.pose = 'crouch'
      }
      break
    }

    case 'land':
      if (clock > LAND_SECONDS) next()
      break
  }

  cat.airPitch = stage === 'air' ? cat.airPitch : 0
  cat.meow = Math.max(0, cat.meow - delta)
}

if (import.meta.env.DEV) {
  // Fast-forwards the route for testing, since a hidden browser pane barely renders any frames.
  const advance = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 30) tickCat(1 / 30, false, false)
    return { stage, index, pose: cat.pose, position: cat.position.toArray() }
  }
  Object.assign(window, { cafeCat: { cat, advance, skip: next } })
}

/** Where to find the cat once it has stopped: the landing spot if it's in mid-air. */
const restSpot = () => (stage === 'air' ? jumpTo : cat.position)

// On a surface the shot matches the one from the cat's home spot. On the floor it comes from higher up, to clear the furniture.
const CLOSE_UP = { surface: [-0.86, 0.44, 0.48] as Vec3, floor: [-0.56, 0.78, 0.74] as Vec3, lookSit: 0.32, raiseSit: 0.1 }

export function catCloseUp(): { position: Vec3; target: Vec3 } {
  const spot = restSpot()
  const offset = spot.y > 0.1 ? CLOSE_UP.surface : CLOSE_UP.floor
  // framed for how it ends up: sitting up, with its head high
  return {
    position: [spot.x + offset[0], spot.y + offset[1] + CLOSE_UP.raiseSit, spot.z + offset[2]],
    target: [spot.x, spot.y + CLOSE_UP.lookSit, spot.z],
  }
}
