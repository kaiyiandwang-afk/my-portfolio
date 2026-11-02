import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { LAYOUT, PALETTE } from '../config'
import { Box, Cyl, Inked, Torus } from './prims'

const RADIUS = 0.24

/** Keeps the visitor's real local time, as in v1. */
export function WallClock() {
  const hour = useRef<Group>(null)
  const minute = useRef<Group>(null)
  const second = useRef<Group>(null)

  useFrame(() => {
    const now = new Date()
    if (second.current) second.current.rotation.z = -(now.getSeconds() / 60) * Math.PI * 2
    if (minute.current) minute.current.rotation.z = -((now.getMinutes() + now.getSeconds() / 60) / 60) * Math.PI * 2
    if (hour.current) hour.current.rotation.z = -(((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2
  })

  return (
    <group position={LAYOUT.clock.position}>
      <Inked>
      <Cyl radius={RADIUS} height={0.03} segments={36} position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} color={PALETTE.cream} />
      <Torus radius={RADIUS} tube={0.024} position={[0, 0, 0.025]} color={PALETTE.woodDark} />
      </Inked>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <Box
            key={i}
            size={[0.01, i % 3 ? 0.024 : 0.04, 0.004]}
            position={[Math.sin(a) * (RADIUS - 0.04), Math.cos(a) * (RADIUS - 0.04), 0.033]}
            rotation={[0, 0, -a]}
            color={PALETTE.ink}
            noCast
          />
        )
      })}
      <group ref={hour} position={[0, 0, 0.038]}>
        <Box size={[0.018, 0.11, 0.004]} position={[0, 0.05, 0]} color={PALETTE.ink} noCast />
      </group>
      <group ref={minute} position={[0, 0, 0.042]}>
        <Box size={[0.012, 0.17, 0.004]} position={[0, 0.08, 0]} color={PALETTE.ink} noCast />
      </group>
      <group ref={second} position={[0, 0, 0.046]}>
        <Box size={[0.004, 0.19, 0.003]} position={[0, 0.07, 0]} color="#b23a2c" noCast />
      </group>
    </group>
  )
}
