import { Vector3 } from 'three'
import type { DepthOfFieldEffect, EffectPass } from 'postprocessing'

/**
 * The rack focus shared between Effects, which owns the depth of field pass, and CameraRig, which drives it.
 * The pass stays mounted but disabled, so turning it on costs nothing per frame and recompiles nothing mid-flight.
 */
export const rack = {
  effect: null as DepthOfFieldEffect | null,
  pass: null as EffectPass | null,
  /** The world point held in focus during a flight. */
  point: new Vector3(),
}
