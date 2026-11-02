import gsap from 'gsap'
import { useCafe } from './store'

/**
 * How far into night the café is, from 0 to 1. One shared value that lights, sky, glass and effects read every frame, so
 * they all fade together with no React re-renders and no shader recompiles.
 */
export const dusk = { night: useCafe.getState().timeOfDay === 'night' ? 1 : 0 }

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

useCafe.subscribe((state, previous) => {
  if (state.timeOfDay === previous.timeOfDay) return
  gsap.to(dusk, {
    night: state.timeOfDay === 'night' ? 1 : 0,
    duration: reducedMotion() ? 0.3 : 2.6,
    ease: 'sine.inOut',
    overwrite: true,
  })
})
