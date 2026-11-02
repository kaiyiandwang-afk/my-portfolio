import { useEffect, useMemo, useRef } from 'react'
import { Leva, button, folder, useControls } from 'leva'
import { LOOK } from '../config'
import type { Look } from '../config'
import { useLook } from '../state/look'

/** Dev only: App.tsx imports this lazily behind import.meta.env.DEV, so leva never reaches production. */
const GROUPS: Record<string, (keyof Look)[]> = {
  Light: ['hemiSky', 'hemiGround', 'hemiIntensity', 'keyColor', 'keyIntensity', 'fillColor', 'fillIntensity', 'bounceColor', 'bounceIntensity', 'pendantColor', 'pendantIntensity', 'lampColor', 'lampIntensity', 'bulbGlow'],
  Air: ['fogColor', 'fogDensity', 'shaftColor', 'shaftIntensity', 'dustColor', 'dustOpacity', 'dustSize'],
  Outside: ['exteriorGain', 'sunGlow'],
  'God rays': ['godRaysDensity', 'godRaysDecay', 'godRaysWeight', 'godRaysExposure', 'godRaysClamp'],
  Bloom: ['bloomIntensity', 'bloomThreshold', 'bloomSmoothing', 'bloomRadius'],
  AO: ['aoRadius', 'aoFalloff', 'aoIntensity', 'aoColor'],
  'Rack focus': ['dofRange', 'dofBokeh'],
  Quality: ['ao', 'aoQuality', 'godRays', 'dof', 'shafts', 'msaa'],
  Grade: ['toneMapping', 'saturation', 'contrast', 'brightness', 'aberration', 'grain', 'vignetteOffset', 'vignetteDarkness'],
}

/** A live frame rate readout. Only meaningful on a visible page, because hidden tabs get no animation frames. */
function FpsMeter() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let handle = 0
    const tick = (now: number) => {
      frames++
      if (now - last >= 500) {
        if (ref.current) ref.current.textContent = `${Math.round((frames * 1000) / (now - last))} fps`
        frames = 0
        last = now
      }
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [])
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        padding: '3px 10px',
        borderRadius: 999,
        font: '700 12px ui-monospace, Menlo, monospace',
        color: '#7fd8b2',
        background: 'rgba(20, 15, 11, 0.7)',
        pointerEvents: 'none',
      }}
    />
  )
}

export default function TuningPanel() {
  const schema = useMemo(() => {
    const groups = Object.fromEntries(
      Object.entries(GROUPS).map(([name, keys]) => [
        name,
        folder(
          Object.fromEntries(
            keys.map((key) => {
              const value = LOOK[key]
              const onChange = (next: unknown) => useLook.setState({ [key]: next } as Partial<Look>)
              if (key === 'toneMapping') return [key, { value, options: ['AGX', 'ACES', 'NEUTRAL'], onChange }]
              if (key === 'aoQuality') return [key, { value, options: ['performance', 'low', 'medium', 'high'], onChange }]
              if (key === 'msaa') return [key, { value, options: [0, 2, 4, 8], onChange }]
              if (typeof value === 'number') {
                const max = Math.max(1, value * 3)
                return [key, { value, min: 0, max, step: max / 300, onChange }]
              }
              return [key, { value, onChange }]
            }),
          ),
          { collapsed: true },
        ),
      ]),
    )
    return {
      ...groups,
      // Paste the logged values into LOOK in src/config.ts to keep them.
      'Log values': button(() => console.log(JSON.stringify(useLook.getState(), null, 2))),
    }
  }, [])

  useControls(() => schema as never)
  return (
    <>
      <Leva collapsed titleBar={{ title: 'Look', position: { x: 0, y: 56 } }} />
      <FpsMeter />
    </>
  )
}
