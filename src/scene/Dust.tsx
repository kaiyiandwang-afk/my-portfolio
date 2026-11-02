import { Sparkles } from '@react-three/drei'
import { useLook } from '../state/look'

/** Dust drifting in the window light. */
export function Dust() {
  const color = useLook((s) => s.dustColor)
  const opacity = useLook((s) => s.dustOpacity)
  const size = useLook((s) => s.dustSize)
  return (
    <Sparkles
      position={[0.9, 1.5, -0.3]}
      scale={[4.6, 2.8, 5.4]}
      count={110}
      size={size}
      speed={0.16}
      noise={0.6}
      opacity={opacity}
      color={color}
    />
  )
}
