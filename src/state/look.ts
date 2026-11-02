import { create } from 'zustand'
import { LOOK } from '../config'
import type { Look } from '../config'

/** The live look values. Defaults come from config; leva writes here in dev, and day/night will tween them. */
export const useLook = create<Look>()(() => ({ ...LOOK }))
