import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { LAYOUT, PALETTE } from '../config'
import { useCafe } from '../state/store'
import { Box, Cyl, Inked } from './prims'

/** The record spins while the music plays. */
export function RecordPlayer() {
  const { position, rotationY } = LAYOUT.recordPlayer
  const platter = useRef<Group>(null)
  useFrame((_, delta) => {
    if (platter.current && useCafe.getState().soundOn) platter.current.rotation.y -= delta * 3.5 // about 33⅓ rpm
  })
  return (
    <Inked>
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[0.5, 0.09, 0.4]} position={[0, 0.045, 0]} color={PALETTE.copper} />
      <group ref={platter} position={[-0.05, 0.1, 0]}>
        <Cyl radius={0.16} height={0.012} segments={32} color={PALETTE.ink} />
        <Cyl radius={0.055} height={0.014} segments={20} color={PALETTE.lantern} noCast noInk />
      </group>
      <Cyl radius={0.016} height={0.05} position={[0.2, 0.115, -0.14]} color={PALETTE.steel} />
      <Box size={[0.018, 0.012, 0.25]} position={[0.16, 0.135, -0.03]} rotation={[0, 0.32, 0]} color={PALETTE.steel} />
    </group>
    </Inked>
  )
}
