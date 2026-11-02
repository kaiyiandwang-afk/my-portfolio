import { useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { Vector3 } from 'three'
import type { Group } from 'three'
import { INTERACTIVES } from '../config'
import type { InteractiveId } from '../config'
import { registerInteractive } from '../state/interactive'
import { useCafe } from '../state/store'

const REST = new Vector3()

/** Wraps an object's visuals: registers it for the hover glow, and lifts it slightly while hovered. */
export function Interactive({ id, children }: { id: InteractiveId; children: ReactNode }) {
  const group = useRef<Group>(null)
  const lift = useMemo(() => {
    const item = INTERACTIVES.find((candidate) => candidate.id === id)
    return new Vector3(...(item?.lift ?? [0, 0, 0]))
  }, [id])

  useLayoutEffect(() => {
    if (!group.current) return
    return registerInteractive(id, group.current)
  }, [id])

  useFrame((_, delta) => {
    if (!group.current) return
    easing.damp3(group.current.position, useCafe.getState().hovered === id ? lift : REST, 0.1, delta)
  })

  return <group ref={group}>{children}</group>
}
