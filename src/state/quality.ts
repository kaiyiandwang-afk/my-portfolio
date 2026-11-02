import { create } from 'zustand'
import { CAT, SUN } from '../config'
import { useLook } from './look'

/**
 * Quality steps from best to lightest, in the order the brief asks for: resolution first, then god rays, rack focus and
 * ambient occlusion. The site starts at a sensible step for the device, and steps down on its own if frames run slow.
 */
const STEPS = [
  { dpr: 1.5, godRays: true, dof: true, ao: true, msaa: 2, shafts: true },
  { dpr: 1.25, godRays: true, dof: true, ao: true, msaa: 2, shafts: true },
  { dpr: 1, godRays: true, dof: true, ao: true, msaa: 2, shafts: true },
  { dpr: 1, godRays: false, dof: true, ao: true, msaa: 2, shafts: true },
  { dpr: 1, godRays: false, dof: false, ao: true, msaa: 0, shafts: true },
  { dpr: 1, godRays: false, dof: false, ao: false, msaa: 0, shafts: true },
  { dpr: 0.8, godRays: false, dof: false, ao: false, msaa: 0, shafts: false },
]

const coarsePointer = window.matchMedia('(pointer: coarse)').matches
const smallScreen = window.innerWidth < 640
const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
const weakDevice = memory <= 4 || navigator.hardwareConcurrency <= 4

/** Phone screens are small and dense, so they need more pixels than a laptop at the same step to look sharp. */
const DPR_BOOST = coarsePointer || smallScreen ? 0.4 : 0

function startingStep() {
  if (location.search.includes('hq')) return 0 // locks full quality, for screenshots
  if (coarsePointer || smallScreen) return 5
  if (weakDevice) return 3
  return 1
}

// Fur shells and the shadow map are built once at load, so these are decided up front, before the scene is created.
if (coarsePointer || smallScreen || weakDevice) {
  CAT.shells = 8
  CAT.legShells = 5
  SUN.shadowMapSize = 2048
}

const SETTLE_MS = 3000

interface QualityState {
  step: number
  dpr: number
  stepDown: () => void
}

function apply(step: number) {
  const { dpr, ...effects } = STEPS[step]
  useLook.setState(effects)
  return { step, dpr: dpr + DPR_BOOST }
}

let lastChange = 0

export const useQuality = create<QualityState>()((set, get) => ({
  ...apply(startingStep()),
  stepDown: () => {
    const now = performance.now()
    // Changing effects recompiles shaders, which itself drops frames, so give it time to settle before judging again.
    if (location.search.includes('hq') || now - lastChange < SETTLE_MS || get().step >= STEPS.length - 1) return
    lastChange = now
    set(apply(get().step + 1))
  },
}))
